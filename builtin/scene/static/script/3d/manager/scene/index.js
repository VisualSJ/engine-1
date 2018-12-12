'use strict';

const { EventEmitter } = require('events');

const utils = require('./utils');
const ipc = require('../ipc');
const nodeManager = require('../node');

let currentSceneUuid = '';
let currentSceneData = null;

/**
 * 场景管理器
 *
 * Events:
 *   scene.on('open', (error, scene) => {});
 *   scene.on('close', (error) => {});
 *   scene.on('reload', (error, scene) => {});
 */
class SceneManager extends EventEmitter {
    constructor() {
        super();

        this.ignore = false;
    }

    /**
     * 打开一个场景资源
     * @param {*} uuid 场景资源的 uuid
     */
    async open(uuid) {
        if (uuid && uuid === currentSceneUuid) {
            return;
        }
        currentSceneUuid = uuid;
        Manager.Ipc.send('broadcast', 'scene:close');
        this.emit('close');

        // cc.view.resizeWithBrowserSize(true);

        if (uuid) {
            try {
                await ipc.send('query-asset-info', uuid);
            } catch (error) {
                uuid = '';
            }
        }

        if (uuid) {
            // 加载指定的 uuid
            try {
                await utils.loadSceneByUuid(uuid);
                currentSceneData = this.serialize();
                !this.ignore && this.emit('open', null, cc.director._scene);
            } catch (error) {
                console.error('Open scene failed: ' + uuid);
                console.error(error);
                currentSceneData = null;
                !this.ignore && this.emit('open', error, null);
            }
        } else {
            const scene = new cc.Scene();
            const canvas = new cc.Node('Canvas');
            canvas.parent = scene;
            canvas.addComponent(cc.Canvas);
            await utils.loadSceneByNode(scene);
            currentSceneData = this.serialize();
            !this.ignore && this.emit('open', null, cc.director._scene);
        }

        // 爬取节点树上的所有节点数据
        await nodeManager.init(cc.director._scene);

        if (currentSceneData) {
            // 发送节点修改消息
            Manager.Ipc.send('broadcast', 'scene:ready', currentSceneUuid);
            Manager.Ipc.send('set-scene', uuid);
        }
    }

    /**
     * 关闭当前打开的场景
     */
    async close() {
        await new Promise((resolve) => {
            setTimeout(() => {
                currentSceneUuid = '';
                currentSceneData = null;
                // 发送节点修改消息
                Manager.Ipc.send('broadcast', 'scene:close');
                !this.ignore && this.emit('close');
                resolve();
            }, 300);
        });
    }

    /**
     * 刷新当前场景并且放弃所有修改
     */
    async reload() {
        let uuid = currentSceneUuid;
        this.ignore = true;
        await close();
        await open(uuid);
        this.ignore = false;

        !this.ignore && this.emit('reload', null, cc.director._scene);
    }

    /**
     * 软刷新，备份当前场景的数据，并重启场景
     */
    async softReload() {
        const json = Manager.Utils.serialize(cc.director.getScene());

        // 发送节点修改消息
        Manager.Ipc.send('broadcast', 'scene:close');

        try {
            await utils.loadSceneByJson(json);
            await nodeManager.init(cc.director._scene);
            !this.ignore && this.emit('reload', null, cc.director._scene);
        } catch (error) {
            console.error('Open scene failed: ' + uuid);
            console.error(error);
            currentSceneData = null;
            !this.ignore && this.emit('reload', error, null);
        }

        if (currentSceneData) {
            // 发送节点修改消息
            Manager.Ipc.send('broadcast', 'scene:ready', currentSceneUuid);
        }
    }

    /**
     * 保存场景
     */
    serialize() {
        let asset = new cc.SceneAsset();
        asset.scene = cc.director.getScene();
        // cc.Object._deferredDestroy();
        return Manager.Utils.serialize(asset);
    }

    /**
     * 同步场景的序列化数据到缓存
     */
    syncSceneData() {
        currentSceneData = this.serialize();
    }

    /**
     * 查询节点数的信息
     * @param {*} uuid
     */
    queryNodeTree(uuid) {
        /**
         * 逐步打包数据
         * @param node
         */
        const step = (node) => {
            if (node._objFlags & cc.Object.Flags.HideInHierarchy) {
                return null;
            }

            const children = node._children.map(step).filter(Boolean);

            return {
                name: node.name,
                type: 'cc.' + node.constructor.name,
                uuid: node._id,
                children: children.length ? children : [],
                prefab: !!node._prefab,
                parent: (node.parent && node.parent.uuid) || '',
            };
        };

        if (uuid) {
            const node = nodeManager.query(uuid);
            if (!node) {
                return null;
            }
            return step(node);
        }

        if (!cc.director._scene) {
            return null;
        }

        return step(cc.director._scene);
    }

    /**
     * 查询一个节点相对于场景的搜索路径
     * @param {*} uuid
     */
    queryNodePath(uuid) {
        let node = nodeManager.query(uuid);
        if (!node) {
            return '';
        }
        let names = [node.name];
        node = node.parent;
        while (node) {
            if (!node) {
                break;
            }
            names.splice(0, 0, node.name);
            node = node.parent;
        }
        return names.join('/');
    }

    /**
     * 查询当前运行的场景是否被修改
     */
    queryDirty() {
        try {
            if (!currentSceneData) {
                return false;
            }

            if (this.serialize() === currentSceneData) {
                return false;
            }

            return true;
        } catch (error) {
            console.error(error);
            return false;
        }

    }
}

module.exports = new SceneManager();
