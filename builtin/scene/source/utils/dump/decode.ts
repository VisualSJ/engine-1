'use strcit';

declare const cc: any;
declare const Manager: any;
const {promisify} = require('util');
import {
    INode,
    IProperty,
} from './interface';

import {
    fillDefaultValue,
    getDefault,
    getTypeInheritanceChain,
    parsingPath,
} from './utils';

// @ts-ignore
import { get, set } from 'lodash';

/**
 * 解码一个 dump 数据
 * @param dump
 * @param node
 */
export async function decodeNode(dump: INode, node?: any) {
    if (!dump) {
        return;
    }

    node = node || cc.Node();

    node.name = dump.name.value;
    node.active = dump.active.value;
    node.setPosition(dump.position.value);
    // @ts-ignore
    node.setRotationFromEuler(dump.rotation.value.x, dump.rotation.value.y, dump.rotation.value.z);
    node.setScale(dump.scale.value);

    if (dump.parent && dump.parent.value && dump.parent.value.uuid) {
        node.parent = Manager.Node.query(dump.parent.value.uuid);
    } else {
        node.parent = null;
    }

    if (dump.children) {
        const dumpChildrenUuids: string[] = dump.children.map((child: any) => child.value.uuid);
        const nodeChildrenUuids: string[] = node.children.map((child: INode) => child.uuid);

        /**
         * 为了不影响两个数组共有的 uuids
         * 移除在 node 且不在 dump 的 uuid
         * 添加在 dump 且不在 node 的 uuid
         */
        nodeChildrenUuids.forEach((uuid: string) => {
            // @ts-ignore
            if (!dumpChildrenUuids.includes(uuid)) {
                const child = Manager.Node.query(uuid);
                // 重要：过滤隐藏节点
                if (child._objFlags & cc.Object.Flags.HideInHierarchy) {
                    return;
                }
                child.parent = null;
            }
        });

        dumpChildrenUuids.forEach((uuid: string) => {
            // @ts-ignore
            if (!nodeChildrenUuids.includes(uuid)) {
                const child = Manager.Node.query(uuid);
                child.parent = node;
            }
        });
    }

    for (let i = 0; i < dump.__comps__.length; i++) {
        const componentDump = dump.__comps__[i];
        let component = node._components[i];

        if (!component) {
            component = node.addComponent(componentDump.type);
        }

        for (const key in componentDump.value) {
            if (!(key in componentDump.value)) {
                continue;
            }
            await decodePatch(key, componentDump.value[key], component);
        }
    }

    if (node.__prefab__) {
        const prefab = node.__prefab__;
        const root = Manager.Node.query(prefab.rootUuid);
        const info = new cc._PrefabInfo();
        info.asset = Manager.Utils.serialize.asAsset(prefab.uuid);
        info.root = root ? root : node;
        info.fileId = node.uuid;
        node._prefab = info;
    }

    return node;
}

/**
 * 解码一个 dump 补丁到指定的 node 上
 * @param path
 * @param dump
 * @param node
 */
export async function decodePatch(path: string, dump: any, node: any) {
    // 将 dump path 转成实际的 node search path
    const info = parsingPath(path);
    const parentInfo = parsingPath(info.search);

    if (
        info.key === 'enabledInHierarchy' ||
        info.key === '__scriptAsset' ||
        info.key === 'uuid'
    ) {
        return;
    }

    // 获取需要修改的数据
    const data = info.search ? get(node, info.search) : node;
    // 判断属性是否为 readonly,是则跳过还原步骤
    let propertyConfig: any = Object.getOwnPropertyDescriptor(data, info.key);
    if (propertyConfig === undefined) {
        // 原型链上的判断
        propertyConfig = cc.Class.attr(data, info.key);
        if (!propertyConfig || !propertyConfig.hasSetter) {
            return;
        }
    } else if (!propertyConfig.writable && !propertyConfig.set) {
        return;
    }

    const parentData = parentInfo.search ? get(node, parentInfo.search) : node;

    // 如果 dump.value 为 null，则需要自动填充默认数据
    if (
        !('value' in dump) ||
        (dump.value === null && dump.type === 'Unknown')
    ) {
        let attr = cc.Class.attr(data, info.key);
        if (Array.isArray(parentData) && parentInfo.search !== '_components') {
            const grandInfo = parsingPath(parentInfo.search);
            const grandData = grandInfo.search ? get(node, grandInfo.search) : node;
            attr = cc.Class.attr(grandData, grandInfo.key);
            attr = cc.Class.attr(attr.ctor, info.key);
        }

        let value = getDefault(attr);

        if (typeof value === 'object' && value) {
            if (typeof value.clone === 'function') {
                value = value.clone();
            } else if (Array.isArray(value)) {
                value = [];
            } else {
                value = {};
            }
        } else if (attr.ctor) {
            value = new attr.ctor();
        }

        data[info.key] = value;

        return value;
    }

    // 获取数据的类型
    const ccType = cc.js.getClassByName(dump.type);
    const ccExtends = ccType ? getTypeInheritanceChain(ccType) : [];
    const nodeType = 'cc.Node';
    const assetType = 'cc.Asset';
    const valueType = 'cc.ValueType';

    // 实际修改数据
    if (ccExtends.includes(nodeType) || nodeType === dump.type) {
        if (!dump.value || !dump.value.uuid) {
            data[info.key] = null;
        } else {
            const node = Manager.Node.query(dump.value.uuid);
            if (info.key === 'parent') {
                node.addChild(data);
            } else {
                data[info.key] = node;
            }
        }
    } else if (dump.isArray) {
        const array: IProperty[] = (dump.value || []);
        await Promise.all(array.map(async (item: IProperty, index: number) => {
            return await decodePatch(`${path}.${index}`, item, data);
        }));
    } else if (ccExtends.includes(assetType) || assetType === dump.type) {
        try {
            if (Array.isArray(dump.value)) {
                const result: any = [];
                for (let i = 0; i < dump.value.length; i++) {
                    const data = dump.value[i];
                    if (!dump.value || !dump.value.uuid) {
                        result[i] = null;
                    } else {
                        result[i] = await promisify(cc.AssetLibrary.loadAsset)(data.value.uuid);
                    }
                }
                data[info.key] = result;
            } else {
                if (!dump.value || !dump.value.uuid) {
                    data[info.key] = null;
                } else {
                    data[info.key] = await promisify(cc.AssetLibrary.loadAsset)(dump.value.uuid);
                }
            }
        } catch (error) {
            console.error(error);
        }

    } else if (ccExtends.includes('cc.Component') || 'cc.Component' === dump.type) {
        data[info.key] = Manager.Component.query(dump.value.uuid);
    } else if (ccExtends.includes(valueType) || valueType === dump.type) {
        const value = new ccType();
        Object.keys(dump.value).forEach((key: string) => {
            value[key] = dump.value[key];
        });
        data[info.key] = value;
    } else if (info.key === 'length' && dump.type === 'Array') {
        while (data.length > dump.value) {
            data.pop();
        }
        const parentData = get(node, parentInfo.search);
        const attr = cc.Class.attr(parentData, parentInfo.key);
        fillDefaultValue(attr, data, data.length, dump.value);
        set(node, info.search, data);
    } else {
        // 转换数据，防止因为 js 弱类型导致数据类型被更改
        if (
            dump.type === 'Number' ||
            dump.type === 'Enum'
        ) {
            dump.value -= 0;
            data[info.key] = dump.value;
        } else if (
            dump.type === 'String'
        ) {
            dump.value += '';
            data[info.key] = dump.value;
        } else if (dump.type === 'cc.AnimationCurve') {
            const curve = new ccType();
            const keyFrameCtor = cc.js.getClassByName('cc.Keyframe');
            curve.keyFrames = [];
            for (const item of dump.value.keyFrames) {
                const keyFrame = new keyFrameCtor();
                keyFrame.time = item.time;
                keyFrame.value = item.value;
                keyFrame.inTangent = item.inTangent;
                keyFrame.outTangent = item.outTangent;
                curve.keyFrames.push(keyFrame);
            }
            curve.postWrapMode = dump.value.postWrapMode;
            curve.postWrapMode = dump.value.preWrapMode;
            data[info.key] = curve;
        } else if (dump.type === 'cc.Gradient') {
            const gradient = new ccType();
            if (dump.value.alphaKeys.length > 0) {
                for (const item of dump.value.alphaKeys) {
                    const AlphaKeyCtor = cc.js.getClassByName('cc.AlphaKey');
                    const alphaKey = new AlphaKeyCtor();
                    alphaKey.time = item.time;
                    alphaKey.alpha = item.alpha;
                    gradient.alphaKeys.push(alphaKey);
                }
            }

            if (dump.value.colorKeys.length > 0) {
                for (const item of dump.value.colorKeys) {
                    const ColorKeyCtor = cc.js.getClassByName('cc.ColorKey');
                    const ColorCtor = cc.js.getClassByName('cc.Color');
                    const colorKey = new ColorKeyCtor();
                    colorKey.time = item.time;
                    item.color && (colorKey.color = new ColorCtor(...item.color));
                    gradient.colorKeys.push(colorKey);
                }
            }

            data[info.key] = gradient;
        } else if (typeof dump.value === 'object') {
            for (const childKey in dump.value) {
                if (dump.value[childKey] === undefined) {
                    continue;
                }
                await decodePatch(childKey, dump.value[childKey], node[info.key]);
            }
        } else {
            data[info.key] = dump.value;
        }
    }

    // 特殊属性
    if (node instanceof cc.Node) {
        switch (info.key) {
            case '_lpos':
                node.setPosition(node._lpos);
                break;
            case 'eulerAngles':
                node.setRotationFromEuler(node.eulerAngles.x, node.eulerAngles.y, node.eulerAngles.z);
                break;
            case '_lscale':
                node.setScale(node._lscale);
                break;
        }
    }

    // 触发引擎内的 setter 更新部分数据
    data[info.key] = data[info.key];
    set(node, info.search, data);
    if (parentInfo && parentInfo.search) {
        const data = get(node, parentInfo.search);
        data[parentInfo.key] = data[parentInfo.key];
    }
}
