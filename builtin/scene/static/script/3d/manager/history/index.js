'use strict';

const nodeManager = require('../node');
const dumpUtils = require('../../utils/dump');
const cache = require('./cache');

const steps = []; // 记录的步骤数据, step 为 { undo: oldDumpdatas, redo: newDumpdatas }
const records = []; // 格式为 uuid[]

let index = -1; // 当前指针
let method = 'redo'; // 'redo' | 'undo' 已执行过的方法
let timeId; // 避免连续操作带来的全部执行，
let isRunning = false;
let stepData = {}; // 最后需要变动的步骤数据，多次撤销的时候数据会先进行合并，格式为 { uuid1: {}, uuid2: {} }

nodeManager.on('changed', (node) => {
    record(node.uuid);
});

nodeManager.on('added', (node) => {
    loopRecord(node);
});

// 新增的是一个复合节点，就需要其子节点也一起记录，例如 prefab
function loopRecord(node) {
    record(node.uuid);

    if (Array.isArray(node.children)) {
        node.children.forEach((child) => {
            loopRecord(child);
        });
    }
}

nodeManager.on('removed', (node) => {
    // 注意：删除节点不需要保存之前的状态，因为它的父节点 children 已做了 change 的变更记录
});

/**
 * 记录受 ipc 修改指令影响的 uuid
 */
function record(uuid) {
    if (!records.includes(uuid)) {
        records.push(uuid);
    }
}

/**
 * 停止记录，并将已记录的数据存档
 */
function stopRecordToArchive() {
    if (records.length === 0) {
        if (index !== steps.length - 1) {
            cache.reset(nodeManager.queryUuids());
        }
        return false;
    }

    const oldData = cache.getNodes(records); // 取得旧数据
    const newData = cache.getNewNodes(records); // 刷新 dumptree, 取得新数据

    records.length = 0;

    return {
        undo: oldData,
        redo: newData,
    };
}

function snapshot() {
    const step = stopRecordToArchive();

    if (step === false) {
        return;
    }

    // 清除指针后面的数据
    const deprecated = steps.splice(index + 1);
    // TODO 内存优化可用从 deprecated 里面包含的对象处理，新的记录点已建立，已删除的节点不可能在 undo 复原，故可以删除；但需考虑编辑器和引擎的其他节点管理机制

    // 存入新步骤
    if (deprecated.length > 0) {
        const current = steps[index];
        const prev = steps[index - 1];

        /**
         * 由于有新的 undo 带来的 changed, snapshot,
         * 导致 steps[index + 1].undo 与 steps[index].undo 一样
         * 需要干掉一个步骤使之连贯
         */
        current.redo = step.undo;
        if (prev) {
            current.undo = prev.redo;
        }

        // 持续操作并反复 redo undo 恰好在一个记录点上，会导致该点为了连贯性而做的数据调整使其成为多余步骤，需要将其删除
        if (JSON.stringify(current.undo) === JSON.stringify(current.redo)) {
            steps.splice(index, 1);
        }
    }

    steps.push(step);

    // 如果步骤数大于 100, 始终保持最大 100
    if (steps.length > 100) {
        const deprecated2 = steps.shift();
        // TODO 内存优化可用从 deprecated2 里面包含的对象处理，不可能再 undo 复原的节点可以删除掉
    }

    // 重设指针和方法
    index = steps.length - 1;
    method = 'redo';
}

/**
 * 撤销
 */
function undo() {
    if (records.length !== 0) {
        snapshot();
    }

    if (method === 'undo') {
        if (index === 0) {
            return;
        }

        index--;
    } else {
        if (index < 0) {
            return;
        }
        method = 'undo';
    }

    const state = restore();

    // 运行中，定时下次运行
    if (state === false) {
        clearTimeout(timeId);
        timeId = setTimeout(() => {
            restore();
        }, 500);
    }
    return state;
}

/**
 * 重做
 */
function redo() {
    if (records.length !== 0) {
        snapshot();
    }

    if (method === 'redo') {
        if (index === steps.length - 1) {
            return;
        }

        index++;
    } else {
        method = 'redo';
    }

    const state = restore();

    // 运行中，定时下次运行
    if (state === false) {
        clearTimeout(timeId);
        timeId = setTimeout(() => {
            restore();
        }, 500);
    }
    return state;
}

/**
 * 场景刷新
 */
async function restore() {
    const dumpdata = steps[index][method];
    Object.assign(stepData, dumpdata);

    if (isRunning) {
        return false;
    }

    isRunning = true;

    // 数据 stepData 是 {} , key 为 uuid ，有多个，value 为改 uuid 节点的引擎属性值
    for (const uuid in stepData) {

        if (!(uuid in stepData)) {
            continue;
        }

        const node = nodeManager.query(uuid);
        if (node) {
            // 还原节点
            await dumpUtils.restoreNode(node, stepData[uuid]);
            // 广播已变动的节点
            Manager.Ipc.send('broadcast', 'scene:node-changed', uuid);
        }
    }

    isRunning = false;
    stepData = {};

    return true;
}

/**
 * 清空操作记录，重置参数
 */
function reset() {
    index = -1;
    method = 'redo';
    steps.length = 0;
    clearTimeout(timeId);
    stepData = {};
    records.length = 0;
}

module.exports = {
    reset,
    record,
    snapshot,
    undo,
    redo,
};
