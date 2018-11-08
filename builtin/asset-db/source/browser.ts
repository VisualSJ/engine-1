'use strict';

import { statSync } from 'fs';
import { copy, ensureDir, existsSync, move, outputFile, remove, rename } from 'fs-extra';
import { basename, extname, join, relative } from 'path';
import { getName } from './utils';

const worker = require('@base/electron-worker');

let isReady: boolean = false;
let assetWorker: any = null;
const assetProtocol = 'db://assets';

module.exports = {
    /**
     * 监听消息
     * ${action}-${method}
     */
    messages: {
        /**
         * 查询是否准备完成
         */
        'query-is-ready'() {
            return isReady;
        },

        /**
         * 重启刷新数据库
         */
        'refresh-database'() {
            if (!assetWorker) {
                throw new Error('Asset DB does not exist.');
            }
            assetWorker.win.reload();
        },

        /**
         * 切换调试模式
         */
        'open-devtools'() {
            assetWorker.debug(true);
        },

        /////////////
        // 查询

        /**
         * 查询资源树
         * @param options 筛选条件配置 name: 资源类型名称
         */
        async 'query-assets'(options: any) {
            if (!assetWorker) {
                throw new Error('Asset DB does not exist.');
            }
            return await assetWorker.send('asset-worker:query-assets', options);
        },

        /**
         * 传入资源的路径，返回 uuid
         */
        async 'query-asset-uuid'(source: string) {
            if (!assetWorker) {
                return null;
            }
            return await assetWorker.send('asset-worker:query-asset-uuid', source);
        },

        /**
         * 查询资源的 url 路径
         * @param uuid 资源 uuid
         */
        async 'query-asset-url'(uuid: string) {
            if (!assetWorker) {
                return null;
            }
            return await assetWorker.send('asset-worker:query-asset-url', uuid);
        },

        /**
         * 查询资源信息
         * @param uuid
         */
        async 'query-asset-info'(uuid: string) {
            if (!assetWorker) {
                throw new Error('Asset DB does not exist.');
            }
            return await assetWorker.send('asset-worker:query-asset-info', uuid);
        },

        /**
         * 查询资源的 meta 信息
         * @param uuid
         */
        async 'query-asset-meta'(uuid: string) {
            if (!assetWorker) {
                throw new Error('Asset DB does not exist.');
            }
            return await assetWorker.send('asset-worker:query-asset-meta', uuid);
        },

        ///////////////
        // 操作

        /**
         * 保存资源的 meta 信息
         * @param {string} uuid
         * @param {*} data
         * @returns
         */
        async 'save-asset-meta'(uuid: string, meta: any) {
            if (!assetWorker) {
                return;
            }
            const dir = join(Editor.Project.path, 'assets');
            const info = await assetWorker.send('asset-worker:query-asset-info', uuid);

            const file = join(dir, info.source.replace(assetProtocol, ''));
            // 如果不存在，停止操作
            if (!existsSync(file)) {
                return;
            }
            try {
                await outputFile(`${file}.meta`, meta);
                console.info('asset meta saved');
                return true;
            } catch (err) {
                console.error(err);
                return false;
            }
        },

        /**
         * 创建一个新的资源
         * @param url db://assets/abc.json
         * @param data 写入文件的 buffer 或者 string
         */
        async 'create-asset'(url: string, data: Buffer | string) {
            if (!assetWorker) {
                return;
            }
            if (!url.startsWith(assetProtocol)) {
                throw new Error('Must be prefixed with db://assets');
            }

            // 文件目录路径
            const dirname = join(Editor.Project.path, 'assets');
            let file = join(dirname, url.substr(assetProtocol.length));

            // 获取可以使用的文件名
            file = getName(file);

            if (data === null) {
                await ensureDir(file);
            } else {
                await outputFile(file, data);
            }

            // 返回插入的文件地址
            return 'db://' + relative(Editor.Project.path, file).replace(/\\/g, '/');
        },

        /**
         * 复制一个资源到指定位置
         * @param url db://assets/abc.json 或者 系统路径 如 C:\Users\**
         * @param to db://assets/abc
         */
        async 'copy-asset'(url: string, to: string) {
            if (!assetWorker) {
                return;
            }

            if (!to.startsWith(assetProtocol)) {
                throw new Error('Must be prefixed with db://assets');
            }

            const dirname = join(Editor.Project.path, 'assets');

            let dest = join(dirname, to.substr(assetProtocol.length));

            if (url.startsWith(assetProtocol)) {
                url = join(dirname, url.substr(assetProtocol.length));
            }

            // 如果其中一个数据是错误的，则停止操作
            if (
                    dest === url ||
                    !existsSync(dest) ||
                    !statSync(dest).isDirectory() ||
                    !existsSync(url)
                ) {
                    return;
                }

            // 复制文件
            const name = basename(url);
            dest = join(dest, name);
            // 获取可以使用的文件名
            dest = getName(dest);
            await copy(url, dest, {
                // @ts-ignore
                overwrite: true,
                filter(a, b) {
                    return extname(a) !== '.meta';
                }
            });

            // 返回插入的文件地址
            return 'db://' + relative(Editor.Project.path, to).replace(/\\/g, '/');
        },

        /**
         * 将一个资源移动到某个地方
         * @param url 需要移动的源资源
         * @param to 移动到某个路境内
         */
        async 'move-asset'(url: string, to: string) {
            if (!assetWorker) {
                return;
            }

            const assets = {
                // 被移动的资源信息
                source: await assetWorker.send('asset-worker:translate-url', url),
                // 移动到这个资源内
                target: await assetWorker.send('asset-worker:translate-url', to),
            };

            // 如果其中一个数据是错误的，则停止操作
            if (
                assets.source === assets.target ||
                !existsSync(assets.source) ||
                !existsSync(assets.target) ||
                !statSync(assets.target).isDirectory()
            ) {
                return;
            }

            // 实际移动逻辑，首先移动 meta 文件，再移动实际文件
            const name = basename(assets.source);
            let dest = join(assets.target, name);
            dest = getName(dest); // 避免目标位置上已有相同名称的文件

            if (existsSync(dest + '.meta')) {
                await remove(dest + '.meta');
            }
            if (existsSync(dest)) {
                await remove(dest);
            }

            move(assets.source + '.meta', dest + '.meta');
            move(assets.source, dest);
        },

        /**
         * 资源重名命 rename
         * @param uuid
         * @param target
         */
        async 'rename-asset'(uuid: string, name: string) {
            if (!assetWorker) {
                return;
            }
            const dir = join(Editor.Project.path, 'assets');
            const info = await assetWorker.send('asset-worker:query-asset-info', uuid);

            const file = join(dir, info.source.replace(assetProtocol, ''));
            const base = basename(file);

            const source = {
                file,
                meta: file + '.meta',
            };

            const target = {
                file: source.file.replace(base, name),
                meta: source.meta.replace(base, name),
            };

            rename(source.meta, target.meta);
            rename(source.file, target.file);
        },

        /**
         * 删除某个资源
         * @param url 一个资源的 url 路径
         */
        async 'delete-asset'(url: string) {
            if (!assetWorker) {
                return;
            }

            const file = await assetWorker.send('asset-worker:translate-url', url);

            // 如果不存在，停止操作
            if (!existsSync(file)) {
                return;
            }

            await remove(file);
            await remove(file + '.meta');
        },
    },

    /**
     * 插件加载的时候执行的逻辑
     * 打开一个新的资源数据库
     */
    async load() {
        await createWorker();
    },

    /**
     * 插件关闭的时候执行的逻辑
     * 关闭打开的 AssetDB
     */
    async unload() {
        // 关闭 worker
        worker.close('asset-db');

        // 更新主进程标记以及广播消息
        isReady = false;
        Editor.Ipc.sendToAll('asset-db:close');
    }
};

/**
 * 创建 asset-db 的 worker 并且初始化
 */
async function createWorker() {
    // 查询引擎数据, 并指定 worker 加载
    const info = await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);
    assetWorker = worker.create('asset-db');
    await assetWorker.init();
    assetWorker.require(join(__dirname, '../static/asset-db'));

    // 是否打开调试模式
    assetWorker.debug(false);

    // 启动 worker 后的初始化操作
    assetWorker.on('asset-worker:startup', () => {
        // 初始化自进程
        assetWorker.send('asset-worker:init', {
            engine: info.path,
            type: Editor.Project.type,
            dist: join(__dirname, '../dist'),
            utils: info.utils
        });

        // 启动内置数据库
        assetWorker.send('asset-worker:startup-database', {
            name: 'internal',
            assets: join(__dirname, '../static/internal', 'assets'),
            library: join(__dirname, '../static/internal', 'library'),
            temp: join(__dirname, '../static/internal', 'temp'),
        });

        // 启动项目数据库
        assetWorker.send('asset-worker:startup-database', {
            name: 'assets',
            assets: join(Editor.Project.path, 'assets'),
            library: join(Editor.Project.path, 'library'),
            temp: join(Editor.Project.path, 'temp/asset-db'),
        });
    });

    // 如果 worker 检测到正在刷新
    assetWorker.on('refresh', () => {
        Editor.Ipc.sendToAll('asset-db:close');
        isReady = false;
    });

    // 如果 worker 检测到关闭
    assetWorker.on('closed', () => {
        Editor.Ipc.sendToAll('asset-db:close');
        isReady = false;
    });

    // 更新主进程标记以及广播消息
    assetWorker.on('asset-worker:ready', async (event: any, name: string) => {
        if (name !== 'assets') {
            return;
        }
        Editor.Ipc.sendToAll('asset-db:ready');
        isReady = true;
    });

    // workder 检测到了插入资源
    assetWorker.on('asset-worker:asset-add', (event: any, uuid: string) => {
        Editor.Ipc.sendToAll('asset-db:asset-add', uuid);
    });

    // worker 检测到了修改资源
    assetWorker.on('asset-worker:asset-change', (event: any, uuid: string) => {
        Editor.Ipc.sendToAll('asset-db:asset-change', uuid);
    });

    // worker 检测到了删除资源
    assetWorker.on('asset-worker:asset-delete', (event: any, uuid: string) => {
        Editor.Ipc.sendToAll('asset-db:asset-delete', uuid);
    });
}
