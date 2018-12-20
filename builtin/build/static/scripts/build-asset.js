const buildResult = require('./build-result');
const { getDestPathNoExt, updateProgress, requestToPackage, getAssetUrl, subAssetSource} = require('./utils');
const platfomConfig = require('./platforms-config');
const {outputFileSync, copySync, ensureDirSync, readJSONSync} = require('fs-extra');
const {join, dirname, extname} = require('path');
const lodash = require('lodash'); // 排序、去重

class AssetBuilder {
    init(type) {
        buildResult.uuidCache = this.uuidCache = []; // 存储资源对应的打包情况

        this.existsCache = buildResult.uuidCache;
        this.result = {};
        this.buildQueue = []; // 构建的资源队列
        this.shoudBuild = true;
        if (type !== 'build-release') {
            this.shoudBuild = false;
            return;
        }
        // 构建时才需要的参数
        this.assetCache = [];
        this.paths = buildResult.paths;
        this.options = buildResult.options;
        let platformInfo = platfomConfig[this.options.platform];
        this.isJSB = platformInfo.isNative;
        this.exportSimpleFormat = !platformInfo.stripDefaultValues || platformInfo.exportSimpleProject;
        this.shouldExportScript = !platformInfo.exportSimpleProject;
        this.copyPaths = [];
    }

    build(scenes, type) {
        return new Promise(async (resolve, reject) => {
            updateProgress('build assets...');
            let startTime = new Date().getTime();
            this.init(type);
            if (!scenes) {
                scenes = await requestToPackage('asset-db', 'query-assets', {
                    type: 'scene',
                });
            }
            for (let item of scenes) {
                this.uuidCache.push(item.uuid);
            }
            this.result.scenes = [];
            await this.beginBuild();
            await this.resolveAsset();
            if (!this.shoudBuild) {
                resolve(this.result);
                return this.result;
            }
            // 对拷贝的任务队列去重，防止同时执行相同的拷贝任务
            this.copyPaths = lodash.unionBy(this.copyPaths, 'src');
            Promise.all(this.copyPaths.map(async (paths) => {
                    await copySync(paths.src, paths.dest);
            })).then(() => {
                let endTime = new Date().getTime();
                updateProgress(`build assets success in ${endTime - startTime} ms`, 30);
                resolve(this.result);
            }).catch((error) => {
                reject(error);
                console.log(`copy asset error: ${error}`);
            });
        });
    }

    // 整理依赖资源数据
    async resolveAsset() {
        let assets = {};
        let internal = {};
        // 去重
        this.uuidCache = [...new Set(this.uuidCache)];
        for (let uuid of this.uuidCache) {
            let asset = await requestToPackage('asset-db', 'query-asset-info', uuid);
            if (asset.importer === 'scene') {
                this.result.scenes.push({ url: asset.source, uuid: asset.uuid });
                continue;
            }
            // ********************* 资源类型 ********************** //
            // 非调试模式下， uuid 需要压缩成短 uuid
            if (this.options && !this.options.debug) {
                uuid = Editor.Utils.UuidUtils.compressUuid(uuid, true);
            }
            // 没有 source, subAssets
            if (!asset.source) {
                asset.source = await subAssetSource(asset.uuid);
                if (asset.source.startsWith('db://assets')) {
                    assets[uuid] = [getAssetUrl(asset.source), asset.type, 1];
                } else if (asset.source.startsWith('db://internal')) {
                    internal[uuid] = [getAssetUrl(asset.source), asset.type, 1];
                }
                continue;
            }
            if (asset.source.startsWith('db://assets')) {
                assets[uuid] = [getAssetUrl(asset.source), asset.type];
            } else if (asset.source.startsWith('db://internal')) {
                internal[uuid] = [getAssetUrl(asset.source), asset.type];
            }
        }
        Object.assign(this.result, {
            rawAssets: {assets, internal},
        });
    }

    async beginBuild() {
        // 查询资源库内位于 resource 文件内的资源
        let assetsList = await requestToPackage('asset-db', 'query-assets', {
            pattern: 'db://assets/resources/**/*',
        });
        for (let asset of assetsList) {
            if (asset.isDirectory || asset.importer === 'database') {
                continue;
            }
            this.uuidCache.push(asset.uuid);
        }
        // 并并执行依赖查找
        Promise.all(this.uuidCache.map(async (uuid) => {
            await this.queryAsset(uuid);
        }));
    }

    /**
     * 构建资源
     * @param {*} uuid
     * @memberof AssetBuilder
     */
    async queryAsset(uuid) {
        let library = await requestToPackage('asset-db', 'query-asset-library', uuid);
        // 不存在对应序列化 json 的资源，不需要去做反序列化操作，例如 fbx
        if (!library['.json']) {
            return;
        }
        const json = readJSONSync(library['.json']);
        const deserializeDetails = new cc.deserialize.Details();
        // deatil 里面的数组分别一一对应，并且指向 asset 依赖资源的对象，不可随意更改/排序
        deserializeDetails.reset();
        let asset = cc.deserialize(json, deserializeDetails, {
            createAssetRefs: true,
            ignoreEditorOnly: true,
        });
        asset._uuid = uuid;
        // 预览时只需找出依赖的资源，无需缓存 asset
        if (this.shoudBuild) {
            // 检查以及查找对应资源，并返回给对应 asset 数据
            deserializeDetails.assignAssetsBy((uuid) => {
                var exists = this.existsCache[uuid];
                if (exists === undefined) {
                    exists = true;
                }
                if (exists) {
                    return Editor.serialize.asAsset(uuid);
                } else {
                    // remove deleted asset reference
                    // if is RawAsset, it would also be ignored in serializer
                    return null;
                }
            });
            await this.compress(asset);
        }
        // 将资源对应的依赖资源加入构建队列，并递归查询依赖
        if (deserializeDetails.uuidList.length > 0) {
            for (let uuid of deserializeDetails.uuidList) {
                this.uuidCache.push(uuid);
                await this.queryAsset(uuid);
            }
        }
    }

    // 压缩构建
    async compress(asset) {
        var nativeAssetEnabled = asset._native &&
        (this.isJSB || !asset.constructor.preventPreloadNativeObject ||
            asset instanceof ALWAYS_INCLUDE_RAW_FILES);
        // output
        let nativePath;
        if (nativeAssetEnabled) {
            nativePath = await this._exportNativeAsset(asset);
        }
        // compress 设置
        let contentJson = Editor.serialize(asset, {
            exporting: !this.options.debug, // 是否是作为正式打包导出的序列化操作
            nicify: !this.exportSimpleFormat,
            stringify: false, // 序列化出来的以 json 字符串形式还是 json 对象显示（ json 对象可以方便调试的时候查看）
            dontStripDefault: this.exportSimpleFormat,
        });
        outputFileSync(getDestPathNoExt(this.paths.res, asset._uuid) + '.json', JSON.stringify(contentJson));
        return nativePath;
    }

    // 导出原始资源
    async _exportNativeAsset(asset) {
        const RAW_ASSET_DEST = 'raw-assets';
        let destBase = join(this.paths.res, RAW_ASSET_DEST);
        ensureDirSync(destBase);
        let assetInfo = await requestToPackage('asset-db', 'query-asset-info', asset._uuid);
        let extName = asset._native || '.json';
        // todo 暂时写死访问不到 source 无法取后缀名，就使用 .json
        if (assetInfo.source) {
            extName = extname(assetInfo.source);
        } else if (assetInfo.library && !(asset instanceof cc.Texture2D)) {
            for (let extname of Object.keys(assetInfo.library)) {
                if (extname === '.json') {
                    continue;
                }
                this.copyPaths.push({
                    src: assetInfo.library[extname],
                    dest: join(this.paths.res, 'import', asset.nativeUrl),
                });
            }
            return;
        }
        let src = assetInfo.library[extName];
        // var relativePath = relative(join(this.paths.project, 'asset'), asset.nativeUrl);
        var dest = join(this.paths.res, RAW_ASSET_DEST, asset.nativeUrl);
        ensureDirSync(dirname(dest));
        if (asset instanceof cc.Texture2D) {
            let meta = this.uuid2meta[asset._uuid];

            let suffix = [];
            try {
                suffix = await promisify(CompressTexture)({
                    src: src,
                    dst: dest,
                    platform: this.platform,
                    compressOption: meta.platformSettings,
                });
            } catch (err) {
                console.error(err);
            }

            if (suffix.length > 0) {
                asset._exportedExts = suffix;
            }
            return;
        }
        this.copyPaths.push({
            src,
            dest,
        });
    }
}
module.exports = new AssetBuilder();
