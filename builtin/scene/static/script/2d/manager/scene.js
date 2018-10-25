'use strict';

const nodeUtils = require('../utils/node');
const dumpUtils = require('../utils/dump');
const camera = require('./camera');

const ipc = require('../../ipc/webview');
const { promisify } = require('util');
const { get } = require('lodash');

let uuid2node = {};

/**
 * 回收站，标记节点的 uuid,
 * 如 trash[uuid] = true;
 * 从回收站被重新使用后，删除该标记， trash[uuid] = undefined;
 */
const trash = {};

/**
 * 打开一个场景
 * @param {*} file
 */
async function open(uuid) {
    // cc.view.resizeWithBrowserSize(true);

    if (uuid) {
        // 加载指定的 uuid
        try {
            await promisify(cc.director._loadSceneByUuid)(uuid);
        } catch (error) {
            console.error(error);
        }
    } else {
        const scene = new cc.Scene();
        const canvas = new cc.Node('Canvas');
        canvas.parent = scene;
        canvas.addComponent(cc.Canvas);
        cc.director.runSceneImmediate(scene);
    }

    camera.setSize(cc.Canvas.instance._designResolution);
    camera.adjustToCenter(10);

    // 爬取节点树上的所有节点数据
    await nodeUtils.walk(uuid2node, cc.director._scene);

    ipc.send('broadcast', 'scene:ready');
}

/**
 * 保存场景
 */
async function serialize() {
    let asset = new cc.SceneAsset();
    asset.scene = cc.director._scene;
    cc.Object._deferredDestroy();
    return Manager.serialize(asset);
}

/**
 * 关闭一个场景
 */
function close() { }

/**
 * 查询一个节点的实例
 * @param {*} uuid
 */
function query(uuid) {
    return uuid2node[uuid] || null;
}

/**
 * 查询节点的 dump 数据
 * @param {*} uuid
 */
function queryNode(uuid) {
    let node = query(uuid);
    if (!node) {
        return null;
    }
    return dumpUtils.dumpNode(node);
}

/**
 * 查询节点数的信息
 * @param {*} uuid
 */
function queryNodeTree(uuid) {
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
            uuid: node._id,
            children: children.length ? children : null,
        };
    };

    if (uuid) {
        const node = query(uuid);
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
function queryNodePath(uuid) {
    let node = query(uuid);
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
 * 设置一个节点的属性
 * @param {*} uuid
 * @param {*} path
 * @param {*} key
 * @param {*} dump
 */
function setProperty(uuid, path, dump) {
    const node = query(uuid);
    if (!node) {
        console.warn(`Set property failed: ${uuid} does not exist`);
        return;
    }

    // 恢复数据
    dumpUtils.restoreProperty(node, path, dump);
}

/**
 * 调整一个数组类型的数据内某个 item 的位置
 * @param uuid 节点的 uuid
 * @param path 数组的搜索路径
 * @param target 目标 item 原来的索引
 * @param offset 偏移量
 */
function moveArrayElement(uuid, path, target, offset) {
    const node = query(uuid);
    if (!node) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

    // 因为 path 内的 __comps__ 实际指向的是 _components
    path = path.replace('__comps__', '_components');

    // 找到指定的 data 数据
    let data = path ? get(node, path) : node;
    if (!data) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

    if (!Array.isArray(data)) {
        console.warn(`Move property failed: ${uuid} - ${path}.${key} isn't an array`);
        return false;
    }

    // 移动顺序
    const temp = data.splice(target, 1);
    data.splice(target + offset, 0, temp[0]);

    return true;
}

/**
 * 删除一个数组元素
 * @param uuid 节点的 uuid
 * @param path 元素所在数组的搜索路径
 * @param index 目标 item 原来的索引
 */
function removeArrayElement(uuid, path, index) {
    const node = query(uuid);
    const key = (path || '').split('.').pop();

    if (key === 'children') {
        console.warn('Unable to change `children` of the parent, Please change the `parent` of the child');
        return false;
    }

    if (!node) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

    // 因为 path 内的 __comps__ 实际指向的是 _components
    path = path.replace('__comps__', '_components');

    // 找到指定的 data 数据
    let data = path ? get(node, path) : node;
    if (!data) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

    if (!Array.isArray(data)) {
        console.warn(`Move property failed: ${uuid} - ${path}.${key} isn't an array`);
        return false;
    }

    // 删除某个 item
    const temp = data.splice(index, 1);

    return true;
}

/**
 * 创建一个组件并挂载到指定的 entity 上
 * @param uuid entity 的 uuid
 * @param component 组件的名字
 */
function createComponent(uuid, component) {
    const node = query(uuid);
    if (!node) {
        console.warn(`create component failed: ${uuid} does not exist`);
        return false;
    }

    node.addComponent(component);
}

/**
 * 移除一个 entity 上的指定组件
 * @param uuid entity 的 uuid
 * @param component 组件的名字
 */
function removeComponent(uuid, component) {
    const node = query(uuid);
    if (!node) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

    node.removeComponent(component);
}

/**
 * 创建一个新节点
 * @param {*} uuid
 * @param {*} name
 * @param {*} data
 */
async function createNode(uuid, name = 'New Node', data) {
    if (!cc.director._scene) {
        return;
    }

    const parent = query(uuid);
    const node = new cc.Node();
    node.name = name;
    parent.addChild(node);

    // 爬取节点树上的所有节点数据
    await nodeUtils.walk(uuid2node, node);

    return {
        uuid: node._id,
        parentUuid: node._parent._id
    };
}

/**
 * 删除一个节点
 * @param {*} uuid
 */
function removeNode(uuid) {
    const node = query(uuid);
    const parent = node.parent;
    parent.removeChild(node);

    // 被删除的节点需要移到回收站，做个 uuid 标记
    addToTrash(uuid);

    return parent.uuid;
}

/**
 * 重设节点的 children
 * 来自 redo undo 的重置
 */
function resetNodeChildren(parentNode, childrenIds) {
    // 全部移除
    const currents = parentNode.children.map((node) => node.uuid);

    currents.forEach((uuid) => {
        const node = query(uuid);
        parentNode.removeChild(node);
        addToTrash(uuid);
    });

    // 重新添加
    childrenIds.forEach((uuid) => {
        const node = query(uuid);
        if (node) {
            parentNode.addChild(node);
            removeFromTrash(uuid);
        }
    });
}

/**
 * 节点移到回收站
 * @param {} uuid
 */
function addToTrash(uuid) {
    trash[uuid] = true;
}

/**
 * 节点从回收站移除
 * @param {} uuid
 */
function removeFromTrash(uuid) {
    trash[uuid] = undefined;
}

module.exports = {
    get uuid2node() {
        return uuid2node;
    },

    open,
    serialize,
    close,

    query,

    queryNode,
    queryNodeTree,
    queryNodePath,

    setProperty,
    // insertArrayProperty,
    moveArrayElement,
    removeArrayElement,

    createComponent,
    removeComponent,

    createNode,
    removeNode,

    resetNodeChildren
};

// TODO 临时解决 dump.js 循环引用 scene.js 中 query 不存在的问题
dumpUtils.setScene(module.exports);
