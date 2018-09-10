'use stirct';

import { AssetDB } from 'asset-db';
import { statSync } from 'fs';
import { ensureDir, ensureDirSync, existsSync, move, outputFile, remove, removeSync } from 'fs-extra';
import { basename, join, relative } from 'path';
import { promisify } from 'util';

let isReady: boolean = false;
let database: AssetDB | null = null;

interface IAssetInfo {
    source: string;
    uuid: string;
    importer: string; // meta 内存储的导入器名字
    files: string[];
}

const source2url = (source: string) => {
    if (!database) {
        return '';
    }
    return relative(database.options.target, source);
};

module.exports = {
    /**
     * 监听消息
     * ${action}-${method}
     */
    messages: {
        /**
         *  查询是否准备完成
         */
        'query-is-ready'() {
            return isReady;
        },

        /**
         * 查询资源树
         */
        'query-assets'(options: any) {
            if (!database) {
                throw new Error('Asset DB does not exist.');
            }

            // 返回所有的资源的基础数据
            const assets = Object.keys(database.uuid2asset).map((uuid) => {
                if (!database) {
                    return null;
                }
                const asset = database.uuid2asset[uuid];
                const info: IAssetInfo = {
                    source: source2url(asset.source),
                    uuid: asset.uuid,
                    importer: asset.meta.importer,
                    files: asset.meta.files.map((ext) => {
                        return asset.library + ext;
                    })
                };
                return info;
            });

            return assets;
        },

        /**
         * 查询资源信息
         * @param uuid
         */
        'query-asset-info'(uuid: string) {
            if (!database) {
                throw new Error('Asset DB does not exist.');
            }
            const asset = database.uuid2asset[uuid];
            if (!asset) {
                throw new Error('File does not exist.');
            }

            const info: IAssetInfo = {
                source: source2url(asset.source),
                uuid: asset.uuid,
                importer: asset.meta.importer,
                files: asset.meta.files.map((ext) => {
                    return asset.library + ext;
                })
            };
            return info;
        },

        /**
         * 查询资源的 meta 信息
         * @param uuid
         */
        'query-asset-meta'(uuid: string) {
            if (!database) {
                throw new Error('Asset DB does not exist.');
            }
            const asset = database.uuid2asset[uuid];
            if (!asset) {
                throw new Error('File does not exist.');
            }
            return asset.meta;
        },

        /**
         * 创建一个新的资源
         * @param url db://assets/abc.json
         * @param data
         */
        async 'create-asset'(url: string, data: Buffer | string) {
            if (!database) {
                return false;
            }

            if (!url.startsWith('db://assets')) {
                // todo info
                return false;
            }

            url = url.substr(12);

            // 文件目录路径
            const dirname = database.options.target;
            let file = join(dirname, url);

            // 名命
            file = rename(file, 0);

            // 创建
            const outputFilePromise = promisify(outputFile);
            const ensureDirPromise = promisify(ensureDir);
            try {
                if (data === null) { // 是文件夹
                    await ensureDirPromise(file);
                } else { // 是文件
                    await outputFilePromise(file, data);
                }
                return true;
            } catch (err) {
                console.log(err);
                return false;
            }

            // 如果创建的文件名称重复 按 001, 002 递增
            // @ts-ignore;
            function rename(filepath: string, suffix: number) {
                let file = filepath;

                if (suffix !== 0) {
                    const fileArr = filepath.split(/\/|\\/);
                    let fileName = fileArr.pop() || '';
                    const nameArr = fileName.split('.');
                    let ext;
                    if (nameArr.length > 1) {
                        ext = nameArr.pop();
                        fileName = nameArr.join('.');
                    } else {
                        fileName = nameArr[0];
                    }

                    // @ts-ignore;
                    fileName += ' - ' + suffix.toString().padStart(3, '0');
                    file = join(...fileArr, (fileName + (ext ? '.' + ext : '')));
                }

                if (existsSync(file)) {
                    // 名称重复
                    suffix++;
                    return rename(filepath, suffix);
                }

                return file;
            }
        },

        /**
         * 将一个资源移动到某个地方
         * @param uuid
         * @param target
         */
        async 'move-asset'(uuid: string, target: string) {
            if (!database) {
                return false;
            }
            const asset = database.uuid2asset[uuid];
            const dir = database.uuid2asset[target];
            if (asset.source === dir.source || !existsSync(asset.source) || !existsSync(dir.source)) {
                return false;
            }
            const newPath = join(dir.source, asset.basename + asset.extname);
            const metaPath = asset.source + '.meta';
            if (!existsSync(metaPath)) {
                return false;
            }

            const movePromise = promisify(move);
            try {
                // @ts-ignore;
                await movePromise(asset.source, newPath, { overwrite: true });
                // @ts-ignore;
                await movePromise(metaPath, newPath + '.meta', { overwrite: true });

                return true;
            } catch (err) {
                console.log(err);
                return false;
            }
        },

        /**
         * 资源重名命 rename
         * @param uuid
         * @param target
         */
        async 'rename-asset'(uuid: string, name: string) {
            if (!database) {
                return false;
            }
            const asset = database.uuid2asset[uuid];
            if (!existsSync(asset.source)) {
                return false;
            }
            const newPath = asset.source.replace(asset.basename + asset.extname, name);

            const movePromise = promisify(move);
            try {
                // @ts-ignore;
                await movePromise(asset.source, newPath, { overwrite: true });

                return true;
            } catch (err) {
                console.log(err);
                return false;
            }
        },

        /**
         * 外部文件系统拖进资源
         * @param uuid
         * @param path
         */
        async 'insert-asset'(uuid: string, path: string) {
            if (!database) {
                return false;
            }
            const asset = database.uuid2asset[uuid];
            const assetStat = statSync(asset.source);

            if (!assetStat.isDirectory()) {
                return false;
            }

            if (asset.source === path || !existsSync(asset.source) || !existsSync(path)) {
                return false;
            }

            const newPath = join(asset.source, basename(path));

            const movePromise = promisify(move);
            try {
                // @ts-ignore;
                await movePromise(path, newPath, { overwrite: true });

                return true;
            } catch (err) {
                console.log(err);
                return false;
            }
        },

        /**
         * 删除某个资源
         * @param uuid
         */
        'delete-asset'(uuid: string) {
            if (!database) {
                return false;
            }
            const asset = database.uuid2asset[uuid];
            existsSync(asset.source) && removeSync(asset.source);
            existsSync(asset.source + '.meta') && removeSync(asset.source + '.meta');
            return true;
        }
    },

    /**
     * 插件加载的时候执行的逻辑
     * 打开一个新的资源数据库
     */
    async load() {
        // 拼接需要使用的地址
        const options = {
            target: join(Editor.Project.path, 'assets'),
            library: join(Editor.Project.path, 'library')
        };

        // 保证文件夹存在
        ensureDirSync(options.target);
        ensureDirSync(options.library);

        // 启动资源数据库
        try {
            database = new AssetDB(options);
            await database.start();

            // 绑定文件添加事件
            database.on('add', (uuid) => {
                Editor.Ipc.sendToAll('asset-db:asset-add', uuid);
            });

            // 绑定文件删除事件
            database.on('delete', (uuid) => {
                Editor.Ipc.sendToAll('asset-db:asset-delete', uuid);
            });
        } catch (error) {
            console.error(error);
        }

        // 更新主进程标记以及广播消息
        isReady = true;
        Editor.Ipc.sendToAll('asset-db:ready');
    },

    /**
     * 插件关闭的时候执行的逻辑
     * 关闭打开的 AssetDB
     */
    async unload() {
        if (database) {
            // 关闭资源数据库
            await database.stop();
            database = null;
        }

        // 更新主进程标记以及广播消息
        isReady = false;
        Editor.Ipc.sendToAll('asset-db:close');
    }
};
