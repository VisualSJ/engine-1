const { join, basename , extname} = require('path');
const { getCustomConfig, getCurrentScene, updateProgress, requestToPackage } = require('./utils');
const { readJSONSync, emptyDirSync, outputFileSync, copySync, ensureDirSync } = require('fs-extra');
const { readFileSync, existsSync, copyFileSync , writeFileSync} = require('fs');
const ejs = require('ejs');
const minify = require('html-minifier').minify;
const CleanCSS = require('clean-css');
const buildResult = require('./build-result');
const platfomConfig = require('./platforms-config');
const WINDOW_HEADER = 'window._CCSettings';
const assetBuilder = require('./build-asset');
const assetPacker = require('./pack-asset');
const scriptBuilder = require('./build-script');
const static_resource = [
    // 需要拷贝的静态资源整理
    'splash.png',
    'style-desktop.css',
];

class Builder {
    constructor() {
        this._paths = null;
        this._options = null;
        this.state = 0; // 当前构建进度
        this._type = ''; // 当前项目类型
        this.enginVersion = '';
    }

    // 初始化整理 options 数据
    async _init(options, config) {
        const tempConfig = await getCustomConfig('build-release');
        const isWeChatSubdomain = options.platform === 'wechatgame-subcontext';
        const isWeChatGame = options.platform === 'wechatgame' || isWeChatSubdomain;
        const isQQPlay = options.platform === 'qqplay';
        const platformInfo = platfomConfig[options.platform];
        const nativeRenderer = !!options.nativeRenderer;
        Object.assign(options, tempConfig, {
            isWeChatGame,
            isQQPlay,
            nativeRenderer,
            isNativePlatform: platformInfo.isNative,
        });

        this.isJSB = platformInfo.isNative;
        this.exportSimpleFormat = !platformInfo.stripDefaultValues || platformInfo.exportSimpleProject;
        this.shouldExportScript = !platformInfo.exportSimpleProject;
        this._type = config.type;
        this._options = options;
        this._paths = this._buildPaths(options.dest, options.debug, config);
        static_resource[1] = options.platform + '.css';
        buildResult.options = options;
    }

    // 项目构建
    async build(options, config) {
        let startTime = new Date().getTime();
        await this._init(options, config);
        // 先清空文件夹
        emptyDirSync(this._paths.dest);
        // 开始正式构建部分
        updateProgress('build setting...');
        updateProgress('build setting...', 20);

        // 并发任务
        Promise.all([
            this._buildHtml(), // 构建拷贝模板 index.html 文件 5%
            this._buildMain(), // 构建拷贝模板 main.js 文件 5%
            this._resolveStatic(), // 其他静态资源拷贝 5%
            this._buildEngine(), // 构建切割引擎 15%
            this.buildSetting(
                {
                    // 构建 settings 脚本,写入脚本 20% (其中包括资源和脚本的构建，资源拷贝资源 30%，打包构建脚本 15%)
                    scenes: options.scenes,
                    debug: options.debug,
                    platform: options.platform,
                    type: 'build-release', // 构建 setting 的种类
                },
                {
                    start_scene: options.start_scene,
                }
            ),
        ]).then(async () => {
            await this._compressSetting(buildResult.settings); // 压缩 settings 脚本并保存在相应位置 5%
            let endTime = new Date().getTime();
            updateProgress(`build sucess in ${endTime - startTime} ms`);
            requestToPackage('preview', 'set-build-path', this._paths.dest);
        });
    }

    // 拷贝静态资源文件 5%
    _resolveStatic() {
        updateProgress('resolove static resource...');
        Promise.all(
            static_resource.map((file) => {
                let src = join(__dirname, './../build-templates/common', file);
                let dest = join(this._paths.dest, file);
                if (!this._options.debug && extname(file) === '.css') {
                    const cssMinify = new CleanCSS();
                    let data = cssMinify.minify(readFileSync(src, 'utf8'));
                    writeFileSync(dest, data.styles, 'utf8');
                    return;
                }
                copyFileSync(src, dest);
            })
        );
        updateProgress('resolove static resource success', 5);
    }

    // 构建基础 index.html 模板部分的代码 5%
    _buildHtml() {
        updateProgress('build index html...');
        let options = this._options;
        const data = {
            project: options.name || basename(options.project),
            previewWidth: options.designWidth,
            previewHeight: options.designHeight,
            orientation: 'auto',
            engine: `cocos${this._type}`,
            webDebuggerSrc: '',
        };
        if (options.eruda) {
            data.webDebuggerSrc = './eruda.min.js';
            copySync(this._paths.webDebuggerSrc, join(this._paths.dest, data.webDebuggerSrc));
        }
        let content = ejs.render(
            readFileSync(join(this._paths.tmplBase, options.platform, 'index.html'), 'utf8'),
            data
        );
        if (!options.debug) {
            content = minify(content, {
                removeComments: true,
                collapseWhitespace: true,
                minifyJS: true,
                minifyCSS: true,
            });
        }
        outputFileSync(join(this._paths.dest, 'index.html'), content);
        updateProgress('build index html success', 5);
    }

    // 构建基础 main.js 模板部分的代码
    _buildMain() {
        updateProgress('build main.js...');
        let options = this._options;
        let contents = readFileSync(join(this._paths.tmplBase, 'common', 'main.js'), 'utf8');
        // qqplay set REMOTE_SERVER_ROOT value
        let isQQPlay = options.platform === 'qqplay';
        const data = {
            includeAnySDK: !!options.includeAnySDK,
            renderMode: !!options.renderMode,
            isWeChatGame: !!options.isWeChatGame,
            isWeChatSubdomain: !!options.isWeChatSubdomain,
            isQQPlay: options.isQQPlay,

            // 用于玩一玩的适配用户代码与引擎代码
            engineCode: '',
            projectCode: '',
            engine: `cocos${this._type}`,
        };
        if (isQQPlay && options.qqplay && options.qqplay.REMOTE_SERVER_ROOT) {
            data.qqplay.REMOTE_SERVER_ROOT = options.qqplay.REMOTE_SERVER_ROOT;
        }
        const content = ejs.render(contents, data);
        outputFileSync(join(this._paths.dest, 'main.js'), content);
        updateProgress('build main.js success', 5);
    }

    // 构建引擎模块
    async _buildEngine() {
        updateProgress('build engine...');
        // hack 当前引擎尚未提供切割引擎的接口,直接拷贝对应文件目录下的文件
        if (this._type === '3d') {
            await copySync(
                join(this._paths.engine, 'bin/cocos-3d.dev.js'),
                join(this._paths.dest, this._options.cocosJsName)
            );
            updateProgress('build engine success', 15);
            return;
        }

        let { isNativePlatform, sourceMaps, excludedModules, enginVersion, nativeRenderer } = this._options;
        let { dest, src, jsCacheExcludes, engine, jsCache } = this._paths;
        let buildDest = isNativePlatform ? src : dest;
        let enginSameFlag = false; // 检查缓存中的引擎是否和当前需要编译的引擎一致
        if (existsSync(jsCacheExcludes)) {
            let json = readJSONSync(jsCacheExcludes);
            enginSameFlag =
                enginVersion === json.version &&
                nativeRenderer === json.nativeRenderer &&
                json.excludes.toString() === excludedModules.toString() &&
                json.sourceMaps === opts.sourceMaps;
        }

        // 与缓存内容一致无需再次编译
        if (enginSameFlag && existsSync(paths.jsCache)) {
            copySync(jsCache, join(dest, basename(jsCache)));
            updateProgress('build engine success', 15);
            resolve();
            return;
        }

        // 构建编译引擎
        let modules = readJSONSync(join(engine, 'modules.json'));
        if (!modules || modules.length < 0) {
            console.error(`${join(engine, 'modules.json')} does not exist`);
            // TODO 通知消息报错
            reject(new Error(`${join(engine, 'modules.json')} does not exist`));
            return;
        }
        const excludes = [];
        // 存在模块设置数据，则整理数据
        if (excludedModules && excludedModules.length > 0) {
            excludedModules.forEach(function(exName) {
                modules.some(function(item) {
                    if (item.name === exName) {
                        if (item.entries) {
                            item.entries.forEach(function(file) {
                                excludes.push(join(engine, file));
                            });
                        }
                        updateProgress('build engine success', 15);
                        resolve();
                        return;
                    }
                });
            });
        }

        // 执行 gulp 任务，编译 cocos js
        await this._buildCocosJs(excludes, buildDest);

        // 拷贝编译后的 js 文件
        copySync(jsCache, join(dest, basename(jsCache)));
        // 保存模块数据
        writeFileSync(
            paths.jsCacheExcludes,
            JSON.stringify({
                excludes: excludedModules,
                version: enginVersion,
                nativeRenderer,
                sourceMaps,
            }),
            null,
            4
        );
        updateProgress('build engine success', 15);
    }

    /**
     *  执行 gulp 任务，编译 cocos js
     * @param {*} excludes
     * @returns
     * @memberof Builder
     */
    _buildCocosJs(excludes, dest) {
        return new Promise((resolve) => {
            let { engine } = this._paths;
            let {
                debug,
                isNativePlatform,
                isWeChatSubdomain,
                sourceMaps,
                nativeRenderer,
                isWeChatGame,
                isQQPlay,
            } = this._options;
            const buildUtil = require(join(engine, 'gulp/tasks/engine'));
            let func;
            if (debug) {
                func = isNativePlatform ? 'buildJsb' : 'buildCocosJs';
            } else {
                func = isNativePlatform ? 'buildJsbMin' : 'buildCocosJsMin';
            }

            // 利用引擎内部的 gulp 任务来打包相应的引擎模块
            let indexPath = join(engine, 'index.js');
            buildUtil[func](
                indexPath,
                dest,
                excludes,
                {
                    wechatgame: !!isWeChatGame,
                    qqplay: !!isQQPlay,
                    runtime: false,
                    nativeRenderer: nativeRenderer,
                    wechatgameSub: !!isWeChatSubdomain,
                },
                resolve,
                sourceMaps
            );
        });
    }

    // 构建缓存需要的各种路径集合
    _buildPaths(dest, debug, config) {
        let paths = {
            dest,
            tmplBase: join(__dirname, './../build-templates'),
            projTmplBase: join(dest, './build-templates'),
            jsCacheDir: join(config.engine, 'bin/.cache'),
            engine: config.engine,
            enginUtil: config.utils,
            project: config.project,
        };
        ensureDirSync(paths.jsCacheDir);
        // hack
        this._options.cocosJsName = `cocos${this._type}-js${debug ? '' : '.min'}.js`;
        Object.assign(paths, {
            template_common: join(paths.tmplBase, 'common/**/*'),
            bundledScript: join(dest, 'src', debug ? 'project.dev.js' : 'project.js'),
            src: join(dest, 'src'),
            res: join(dest, 'res'),
            settings: join(dest, 'src/settings.js'),
            jsCacheExcludes: join(paths.jsCacheDir, debug ? '.excludes' : '.excludes-min'), // 生成的一个用于快速判断当前引擎内包含的模块
            jsCache: join(paths.jsCacheDir, this._options.platform, this._options.cocosJsName),
            webDebuggerSrc: join(config.app, 'node_modules/eruda/eruda.min.js'),
        });
        buildResult.paths = paths;
        return paths;
    }

    // 压缩 settings 脚本并保存
    _compressSetting(settings) {
        updateProgress('compress setting.js...');
        if (this._options.debug) {
            this.saveSetting(settings);
            return settings;
        }
        let uuidIndices = {};
        const that = this;
        function collectUuids() {
            let uuids = (settings.uuids = []);
            let uuidCount = {};

            function addUuid(uuid) {
                var count = (uuidCount[uuid] || 0) + 1;
                uuidCount[uuid] = count;
                if (count >= 2 && !(uuid in uuidIndices)) {
                    uuidIndices[uuid] = uuids.length;
                    uuids.push(uuid);
                }
            }

            let rawAssets = settings.rawAssets;
            Object.values(rawAssets).forEach((value) => {
                for (let uuid of Object.keys(value)) {
                    addUuid(uuid);
                }
            });

            let scenes = settings.scenes;
            for (let scene of scenes) {
                addUuid(scene.uuid);
            }

            let packedAssets = settings.packedAssets;
            for (let value of Object.values(packedAssets)) {
                value.forEach(addUuid);
            }

            let md5AssetsMap = settings.md5AssetsMap;
            for (let md5Entries of Object.values(md5AssetsMap)) {
                for (let i = 0; i < md5Entries.length; i += 2) {
                    addUuid(md5Entries[i]);
                }
            }

            if (that._options.preloadDepends) {
                for (let uuid of Object.keys(depends)) {
                    // count reference
                    addUuid(uuid);
                    depends[uuid].forEach(addUuid);
                }
            }

            // sort by reference count
            uuids.sort((a, b) => uuidCount[b] - uuidCount[a]);
            uuids.forEach((uuid, index) => (uuidIndices[uuid] = index));
        }
        // 先计算收集超过使用超过 1 次的 uuid
        collectUuids();

        // 将有使用到收集到 uuid 的位置替换为 uuids 的索引
        let originRawAssets = settings.rawAssets;
        let newRawAssets = (settings.rawAssets = {});
        let assetTypes = (settings.assetTypes = []);
        for (let assetsType of Object.keys(originRawAssets)) {
            let originEntries = originRawAssets[assetsType];
            let newEntries = (newRawAssets[assetsType] = {});
            for (let uuid of Object.keys(originEntries)) {
                const entry = originEntries[uuid];
                let index = uuidIndices[uuid];
                if (index !== undefined) {
                    uuid = index;
                }
                let assetIndex = assetTypes.indexOf(entry[1]);
                if (assetIndex === -1) {
                    assetTypes.push(entry[1]);
                    assetIndex = assetTypes.indexOf(entry[1]);
                }
                entry[1] = assetIndex;
                newEntries[uuid] = entry;
            }
        }

        let scenes = settings.scenes;
        for (let i = 0; i < scenes.length; ++i) {
            let scene = scenes[i];
            let uuidIndex = uuidIndices[scene.uuid];
            if (uuidIndex !== undefined) {
                scene.uuid = uuidIndex;
            }
        }

        let packedAssets = settings.packedAssets;
        for (let key of Object.keys(packedAssets)) {
            let packedIds = packedAssets[key];
            for (let i = 0; i < packedIds.length; ++i) {
                let uuidIndex = uuidIndices[packedIds[i]];
                if (uuidIndex !== undefined) {
                    packedIds[i] = uuidIndex;
                }
            }
        }
        let settingsInitFunction;
        if (that._options.md5Cache) {
            let md5AssetsMap = settings.md5AssetsMap;
            for (let md5Entries of md5AssetsMap) {
                for (let i = 0; i < md5Entries.length; i += 2) {
                    let uuidIndex = uuidIndices[md5Entries[i]];
                    if (uuidIndex !== undefined) {
                        md5Entries[i] = uuidIndex;
                    }
                }
            }
            settingsInitFunction = function(settings) {
                var uuids = settings.uuids;
                var md5AssetsMap = settings.md5AssetsMap;
                for (var md5Entries of md5AssetsMap) {
                    for (var i = 0; i < md5Entries.length; i += 2) {
                        if (typeof md5Entries[i] === 'number') {
                            md5Entries[i] = uuids[md5Entries[i]];
                        }
                    }
                }
            };
        }

        if (that._options.preloadDepends) {
            // set reference index
            for (var asset of Object.keys(depends)) {
                var dep = depends[asset].map((depend) => {
                    var uuidIndex = uuidIndices[depend];
                    if (uuidIndex !== undefined) {
                        return uuidIndex;
                    }
                    return depend;
                });
                var uuidIndex = uuidIndices[asset];
                if (uuidIndex !== undefined) {
                    delete depends[asset];
                    depends[uuidIndex] = dep;
                } else {
                    depends[asset] = dep;
                }
            }
        }
        this.saveSetting(settings, settingsInitFunction);
        return settings;
    }

    /**
     * 保存脚本
     * @param {object} settings
     * @memberof Builder
     */
    saveSetting(settings, settingsInitFunction) {
        buildResult.settings = settings;
        let content = `${WINDOW_HEADER} = ${JSON.stringify(settings, null, this._options.debug ? 4 : 0).replace(
            /"([A-Za-z_$][0-9A-Za-z_$]*)":/gm,
            '$1:'
        )}`;
        if (settingsInitFunction) {
            // 把自解压代码放到 settings.js 中，便于代码压缩，并且避免变更 main.js。
            // 记得这里面的代码只能用 ES5
            content += `(${settingsInitFunction.toString()})(${WINDOW_HEADER});`;
        }
        outputFileSync(this._paths.settings, content);
        updateProgress('compress setting.js success', 5);
    }

    /**
     * 构建 setting 的脚本信息
     * @param {*} options 脚本配置信息(除 type 之外的可以直接放置进 setting 的部分)
     * @param {*} config 其他平台配置 (需要处理后方能加进 setting 的部分)
     * @returns JSON
     */
    async buildSetting(options, config) {
        let tempConfig = await getCustomConfig(options.type, config);
        let currenScene;
        if (config && config.start_scene) {
            currenScene = await getCurrentScene(config.start_scene);
        } else {
            currenScene = await getCurrentScene();
        }
        const setting = Object.assign(options, tempConfig);
        setting.launchScene = currenScene.source;

        // 预览模式下的 canvas 宽高要以实际场景中的 canvas 为准
        if (options.type !== 'build-release') {
            let json = readJSONSync(currenScene.library['.json']);
            let info = json.find((item) => {
                return item.__type__ === 'cc.Canvas';
            });
            // 存在 canvas 节点数据则更新分辨率
            if (info) {
                setting.designWidth = info._designResolution.width;
                setting.designHeight = info._designResolution.height;
            }
        }
        let scripts = (await scriptBuilder.build(options.type)) || {};
        setting.packedAssets = {};
        setting.md5AssetsMap = {};
        let assetBuilderResult = await assetBuilder.build(setting.scene, options.type);
        Object.assign(setting, assetBuilderResult, { scripts });
        buildResult.settings = setting;
        if (options.type === 'build-release') {
            setting.packedAssets = assetPacker.pack();
            return setting;
        }
        delete setting.type;
        return `${WINDOW_HEADER} = ${JSON.stringify(setting)}`;
    }
}

module.exports = new Builder();
