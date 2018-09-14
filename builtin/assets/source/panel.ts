'use strict';

import { readFileSync } from 'fs';
import { extname, join } from 'path';

let panel: any = null;

let vm: any = null;

let treeData: ItreeAsset; // 树形结构的数据，含 children

/**
 * 考虑到 key 是数字且要直接用于运算，Map 格式的效率会高一些
 * 将所有资源按照 key = position.top 排列，value = ItreeAsset
 */
const positionMap: Map<number, ItreeAsset> = new Map();

const treeNodeHeight: number = 20; // 配置每个资源的高度，需要与css一致

let dragOverNode: any; // 拖拽时鼠标处于哪个节点上
let timeIdShadowHide: any; // 延时取消高亮，避免高亮与不高亮之间的操作闪烁

const Vue = require('vue/dist/vue.js');

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

/**
 * 配置 assets 的 iconfont 图标
 */
export const fonts = [{
    name: 'assets',
    file: 'packages://assets/static/iconfont.woff',
}];

export const $ = {
    content: '.content',
};

export const methods = {

    /**
     * 刷新显示面板
     */
    async refresh() {
        const initData = await Editor.Ipc.requestToPackage('asset-db', 'query-assets');
        // 数据格式需要转换一下
        // console.log(initData);
        treeData = transformData(initData);
        vm.changeTreeData();
    }
};

export const messages = {

    /**
     * asset db 准备就绪
     * 去除 loading 状态，并且显示资源树
     */
    'asset-db:ready'() {
        panel.$.loading.hidden = true;
        vm.ready = true;
        panel.refresh();
    },

    /**
     * asset db 关闭
     * 打开 loading 状态，并隐藏资源树
     */
    'asset-db:close'() {
        panel.$.loading.hidden = false;
        vm.ready = false;
        vm.list = [];
    },

    /**
     * 选中了某个物体
     * @param type 选中物体的类型
     * @param uuid 选中物体的 uuid
     */
    'selection:select'(type: string, uuid: string) {
        if (type !== 'asset') {
            return;
        }
        const index = vm.select.indexOf(uuid);
        if (index === -1) {
            vm.select.push(uuid);
        }
    },

    /**
     * 取消选中了某个物体
     * @param type 选中物体的类型
     * @param uuid 选中物体的 uuid
     */
    'selection:unselect'(type: string, uuid: string) {
        if (type !== 'asset') {
            return;
        }
        const index = vm.select.indexOf(uuid);
        if (index !== -1) {
            vm.select.splice(index, 1);
        }
    },

    /**
     * asset db 广播通知添加了 asset
     * 在显示的资源树上添加上这个资源
     * @param uuid 选中物体的 uuid
     */
    async 'asset-db:asset-add'(uuid: string) {
        // 没有初始化的时候，无需处理添加消息
        if (!vm.ready) {
            return;
        }

        const source = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
        const newNode = legalData([source])[0];
        addTreeData(treeData.children, 'source', 'parent', newNode);
        // 触发节点数据已变动
        vm.changeTreeData();
    },

    /**
     * asset db 广播通知删除了 asset
     * 在显示的资源树上删除这个资源
     * @param uuid 选中物体的 uuid
     */
    async 'asset-db:asset-delete'(uuid: string) {
        // 没有初始化的时候，无需处理添加消息
        if (!vm.ready) {
            return;
        }

        // 删除当前数据
        removeTreeData(uuid);

        // 触发节点数据已变动
        vm.changeTreeData();
    },
};

export async function ready() {
    // @ts-ignore
    panel = this;

    const isReady = await Editor.Ipc.requestToPackage('asset-db', 'query-is-ready');

    vm = new Vue({
        el: panel.$.content,
        data: {
            ready: isReady,
            expand: false, // 是否全部展开
            select: [],
            viewHeight: 0, // 当前树形的可视区域高度
            scrollTop: 0, // 当前树形的滚动数据
            search: '', // 搜索资源名称
            nodes: [], // 当前树形在可视区域的资源数据
            shadowOffset: {}, // 拖动时高亮的目录区域位置
        },
        components: {
            tree: require('./components/tree'),
        },
        watch: {
            /**
             * 监听属性 viewHeight
             * 高度变化，刷新树形
             */
            viewHeight() {
                vm.renderTree();
            },
            /**
             * 监听属性 scrollTop
             * 滚动变化，刷新树形
             */
            scrollTop() {
                vm.renderTree();
            },
            /**
             * 监听属性 搜索资源名称
             */
            search() {
                vm.changeTreeData();
            },
        },
        mounted() {

            // 初始化搜索框
            this.$refs.searchInput.placeholder = Editor.I18n.t('assets.menu.searchPlaceholder');
            this.$refs.searchInput.addEventListener('change', (event: Event) => {
                const $target: any = event.target;
                this.search = $target.value.trim();
            });

            // 初始化监听 scroll 事件
            this.$refs.viewBox.addEventListener('scroll', () => {
                vm.scrollTree(vm.$refs.viewBox.scrollTop);
            }, false);

            // 下一个 Vue Tick 触发
            this.$nextTick(() => {
                this.resizeTree();
            });
        },
        methods: {
            /**
             * 创建资源
             * @param item
             * @param json
             */
            newAsset(uuid: string, json: IaddAsset) {
                if (uuid === '') {
                    if (!vm.select[0]) { // 当前没有选中的资源
                        uuid = treeData.uuid; // 根资源
                    } else {
                        uuid = vm.select[0]; // 当前选中的资源
                    }
                }

                newAsset(uuid, json);
            },
            /**
             * 删除资源
             * @param item
             */
            deleteAsset(uuid: string) {
                // 如果当前资源已被选中，先取消选择
                if (vm.select.includes(uuid)) {
                    Editor.Ipc.sendToPackage('selection', 'unselect', 'node', uuid);
                }

                Editor.Ipc.sendToPackage('asset-db', 'delete-asset', uuid);
            },
            /**
             * 资源的折叠切换
             * @param uuid
             */
            toggleAsset(uuid: string) {

                const one = getAssetFromTreeData(treeData, uuid)[0]; // 获取该资源的数据，包含子资源

                if (one) {
                    one.isExpand = !one.isExpand;

                    vm.changeTreeData();
                }
            },
            /**
             * 折叠或展开面板
             */
            toggleAll() {
                vm.expand = !vm.expand;

                resetAssetProperty(treeData, { isExpand: vm.expand });

                vm.changeTreeData();
            },
            /**
             * 节点多选
             */
            async multipleSelect(uuid: string | string[]) {
                if (Array.isArray(uuid)) {
                    Editor.Ipc.sendToPackage('selection', 'clear', 'asset');
                    Editor.Ipc.sendToPackage('selection', 'select', 'asset', uuid);
                    return;
                }
                const uuids = await Editor.Ipc.requestToPackage('selection', 'query-select', 'asset');
                if (uuids.length === 0) {
                    return;
                }
                const one = getAssetFromPositionMap(uuid); // 当前给定的元素
                const first = getAssetFromPositionMap(uuids[0]); // 已选列表中的第一个元素
                if (one !== undefined && first !== undefined) {
                    const select: string[] = [];
                    const min = one.top < first.top ? one.top : first.top;
                    const max = min === one.top ? first.top : one.top;
                    for (const [top, json] of positionMap) {
                        if (min <= top && top <= max) {
                                select.push(json.uuid);
                        }
                    }
                    select.splice(select.findIndex((id) => id === first.uuid), 1);
                    select.unshift(first.uuid);
                    select.splice(select.findIndex((id) => id === one.uuid), 1);
                    select.push(one.uuid);

                    Editor.Ipc.sendToPackage('selection', 'clear', 'asset');
                    Editor.Ipc.sendToPackage('selection', 'select', 'asset', select);
                }
            },
            /**
             * 修改资源属性
             * 这是异步的，只做发送
             * 获取在另外ipc 'assets-db:node-changed' 处理数据替换和刷新视图
             * @param item
             * @param name
             */
            renameAsset(item: ItreeAsset, name = '') {

                const one = getAssetFromTreeData(treeData, item.uuid)[0]; // 获取该资源的数据

                if (!one || name === '') {
                    // name存在才能重名命，否则还原状态
                    item.state = '';
                    return;
                }

                // 重名命资源
                Editor.Ipc.sendToPackage('asset-db', 'rename-asset', item.uuid, name);

                item.state = 'loading'; // 显示 loading 效果
            },
            /**
             * 拖动中感知当前所处的文件夹，高亮此文件夹
             */
            overAsset(uuid: string) {
                // @ts-ignore
                let node: ItreeAsset = getAssetFromPositionMap(uuid);
                if (!node.isDir) {
                    // @ts-ignore
                    node = getAssetFromPositionMap(node.parent);
                    node.state = 'over';
                }

                if (node !== dragOverNode) {
                    if (dragOverNode) {
                        dragOverNode.state = '';
                    }
                    dragOverNode = node;
                }
                clearTimeout(timeIdShadowHide);
                // @ts-ignore
                this.shadowOffset = [node.top + 4, node.height > treeNodeHeight ? (node.height + 3) : node.height];
            },
            /**
             * 拖动中感知当前所处的文件夹，离开后取消高亮
             */
            leaveAsset(uuid: string) {
                // @ts-ignore
                let node: ItreeAsset = getAssetFromPositionMap(uuid);
                if (!node.isDir) {
                    // @ts-ignore
                    node = getAssetFromPositionMap(node.parent);
                }

                if (node !== dragOverNode) {
                    // @ts-ignore
                    this.shadowOffset = [0, 0];
                    node.state = '';
                }

                clearTimeout(timeIdShadowHide);
                timeIdShadowHide = setTimeout(() => {
                    // @ts-ignore
                    this.shadowOffset = [0, 0];
                    node.state = '';
                }, 100);
            },
            /**
             * 资源拖动
             *
             * @param json
             */
            dropAsset(item: ItreeAsset, json: IdragAsset) {
                if (json.insert !== 'inside') {
                    return false; // 不是拖动的话，取消
                }

                const toData = getAssetFromTreeData(treeData, json.to); // 将被注入数据的对象

                let target: ItreeAsset;

                // @ts-ignore
                const toNode: ItreeAsset = getAssetFromPositionMap(toData[0].uuid);

                if (toNode.isDir) {
                    target = toNode;
                } else {
                    // @ts-ignore
                    target = getAssetFromPositionMap(toData[3].uuid); // 树形节点的父级
                }

                if (json.from === 'osFile') { // 从外部拖文件进来
                    // TODO 面板需要有等待的遮罩效果
                    console.log(json);
                    // @ts-ignore
                    json.files.forEach((one) => {
                        insertAsset(target.uuid, one.path);
                    });
                    return;
                } else { // 常规内部节点拖拽
                    const fromData = getAssetFromTreeData(treeData, json.from);

                    if (target.uuid === fromData[3].uuid) {
                        return false; // 资源移动仍在原来的目录内，不需要移动
                    }

                    // 移动资源
                    Editor.Ipc.sendToPackage('asset-db', 'move-asset', json.from, target.uuid);

                    if (target) {
                        target.state = 'loading'; // 显示 loading 效果
                    }
                }
            },
            /**
             * 树形数据已改变
             * 如资源增删改，是较大的变动，需要重新计算各个配套数据
             */
            changeTreeData() {

                positionMap.clear(); // 清空数据

                calcAssetPosition(); // 重算排位

                calcAssetHeight(); // 计算文件夹的高度

                vm.renderTree(); // 重新渲染出树形

                // 重新定位滚动条, +1 是为了离底部一些距离，更美观，也能避免死循环 scroll 事件
                vm.$refs.scrollBar.style.height = (positionMap.size + 1) * treeNodeHeight + 'px';
            },
            /**
             * 重新渲染树形
             * nodes 存放被渲染的资源数据
             * 主要通过 nodes 数据的变动
             */
            renderTree() {

                vm.nodes = []; // 先清空，这种赋值机制才能刷新vue，而 .length = 0 不行

                // const min = vm.scrollTop - treeNodeHeight / 2; // 算出可视区域的 top 最小值
                const min = vm.scrollTop - treeNodeHeight; // 算出可视区域的 top 最小值
                const max = vm.viewHeight + vm.scrollTop; // 最大值

                for (const [top, json] of positionMap) {
                    if (top >= min && top <= max) { // 在可视区域才显示
                        vm.nodes.push(json);
                    }
                }
            },
            /**
             * dock-layout resize 事件被触发了
             * 即可视区域的高度有调整
             * viewHeight 已被监听，所以视图也会跟着变化
             */
            resizeTree() {
                vm.viewHeight = vm.$refs.viewBox.clientHeight;
            },
            /**
             * 滚动了多少，调整滚动条位置
             * @param scrollTop
             */
            scrollTree(scrollTop = 0) {

                const mode = scrollTop % treeNodeHeight;
                let top = scrollTop - mode;
                if (mode === 0 && scrollTop !== 0) {
                    top -= treeNodeHeight;
                }
                vm.$refs.tree.$el.style.top = `${top}px`; // 模拟出样式

                vm.scrollTop = scrollTop; // 新的滚动值
            },
            /**
             * 创建按钮的弹出菜单
             */
            menuPopupNew(event: Event) {
                Editor.Menu.popup({
                    // @ts-ignore
                    x: event.pageX,
                    // @ts-ignore
                    y: event.pageY,
                    menu: [
                        {
                            label: Editor.I18n.t('assets.menu.newFolder'),
                            click() {
                                vm.newAsset('', { type: 'folder' });
                            }
                        },
                        {
                            type: 'separator'
                        },
                        {
                            label: Editor.I18n.t('assets.menu.newJavascript'),
                            click() {
                                vm.newAsset('', { type: 'javascript' });
                            }
                        },
                    ]
                });
            }
        },
    });

    // db 就绪状态才需要查询数据
    isReady && panel.refresh();
}

export async function beforeClose() { }

export async function close() {
    Editor.Ipc.sendToPackage('selection', 'clear', 'asset');
}

export const listeners = {
    resize() {
        // 临时监听窗口的变化
        vm.resizeTree();
    },
};

/**
 * 计算所有树形资源的位置数据，这一结果用来做快速检索
 * 重点是设置 positionMap 数据
 * 返回当前序号
 * @param obj
 * @param index 资源的序号
 * @param depth 资源的层级
 */
function calcAssetPosition(obj = treeData, index = 0, depth = 0) {
    const tree = obj.children;
    tree.forEach((json) => {
        const start = index * treeNodeHeight;  // 起始位置

        const one = {
            name: json.name,
            filename: json.filename,
            fileext: json.fileext,
            uuid: json.uuid,
            children: json.children,
            top: start,
            _height: treeNodeHeight,
            get height() {
                return this._height;
            },
            set height(add) {
                if (add) {
                    this._height += treeNodeHeight;

                    // 触发其父级高度也增加
                    for (const [top, json] of positionMap) {
                        if (json.uuid === this.parent) {
                            json.height = 1; // 大于 0 就可以，实际计算在内部的setter
                        }
                    }
                } else {
                    this._height = treeNodeHeight;
                }
            },
            parent: json.parent,
            depth: 1, // 第二层，默认给搜索状态下赋值
            isDir: json.isDir || false,
            isParent: false,
            isExpand: true,
            state: '',
        };

        if (vm.search === '') { // 没有搜索，不存在数据过滤的情况
            positionMap.set(start, Object.assign(one, { // 平级保存
                depth,
                isParent: json.children && json.children.length > 0 ? true : json.isDir ? true : false,
                isExpand: json.children && json.isExpand ? true : false,
            }));

            index++; // index 是平级的编号，即使在 children 中也会被按顺序计算

            if (json.children && json.isExpand === true) {
                index = calcAssetPosition(json, index, depth + 1); // depth 是该资源的层级
            }
        } else { // 有搜索
            // @ts-ignore
            if (!['root', 'assets'].includes(json.uuid) && json.name.indexOf(vm.search) !== -1) { // 平级保存
                positionMap.set(start, one);
                index++; // index 是平级的编号，即使在 children 中也会被按顺序计算
            }

            if (json.children) {
                index = calcAssetPosition(json, index, 0);
            }
        }

    });
    // 返回序号
    return index;
}

/**
 * 计算一个文件夹的完整高度
 */
function calcAssetHeight() {
    for (const [top, json] of positionMap) {
        json.height = 0;
    }

    for (const [top, json] of positionMap) {
        for (const [t, j] of positionMap) {
            if (j.uuid === json.parent) {
                j.height = 1; // 大于 0 就可以，实际计算在内部的 setter 函数
            }
        }
    }
}

/**
 * 重置某些属性，比如全部折叠或全部展开
 * @param obj
 * @param props
 */
function resetAssetProperty(obj: ItreeAsset, props: any) {
    const tree = obj.children;
    tree.forEach((json: any) => {
        for (const k of Object.keys(props)) {
            json[k] = props[k];
        }

        if (json.children) {
            resetAssetProperty(json, props);
        }
    });
}

/**
 * 这个数据处理，临时使用，很快会被删除
 * 获取 uuid 所在的 ItreeNode 对象 node,
 * 对象所在数组索引 index，
 * 所在数组 array，
 * 所在数组其所在的对象 object
 * 返回 [node, index, array, object]
 *
 * @param arr
 * @param uuid
 */
function getAssetFromTreeData(obj: ItreeAsset, uuid = ''): any {
    let rt = [];

    if (obj.uuid === uuid) {
        return [obj]; // 根资源比较特殊
    }

    const arr = obj.children;
    for (let i = 0, ii = arr.length; i < ii; i++) {
        const one = arr[i];

        if (one.uuid === uuid) { // uuid全等匹配
            return [one, i, arr, obj];
        }

        if (one.children && one.children.length !== 0) { // 如果还有children的继续迭代查找
            rt = getAssetFromTreeData(one, uuid);

            if (rt.length > 0) { // 找到了才返回，找不到，继续循环
                return rt;
            }
        }
    }

    return rt;
}

/**
 * 更快速地找到树形节点
 */
function getAssetFromPositionMap(uuid = '') {
    for (const [top, json] of positionMap) {
        if (uuid === json.uuid) {
            return json;
        }
    }
}

/**
 * 改变现有资源数据
 * @param uuid 现有资源的uuid
 * @param dumpData 新的数据包
 */
function changeTreeData(uuid: string, dumpData: any) {
    // 现有的资源数据
    const nodeData = getAssetFromTreeData(treeData, uuid)[0];

    // 属性是值类型的修改
    ['name'].forEach((key) => {
        if (nodeData[key] !== dumpData[key].value) {
            nodeData[key] = dumpData[key].value;
        }
    });

    // 属性值是对象类型的修改， 如 children
    const childrenKeys: string[] = nodeData.children.map((one: ItreeAsset) => one.uuid);
    const newChildren: ItreeAsset[] = [];
    dumpData.children.value.forEach((json: any, i: number) => {
        const id: string = json.value;
        const index = childrenKeys.findIndex((uid) => id === uid);
        let one;
        if (index !== -1) { // 平级移动
            one = nodeData.children[index]; // 原来的父级资源有该元素
        } else { // 跨级移动
            const arrInfo = getAssetFromTreeData(treeData, id); // 从全部数据中找出被移动的数据
            one = arrInfo[2].splice(arrInfo[1], 1)[0];
        }
        one.isExpand = false;
        newChildren.push(one);
    });
    nodeData.children = newChildren;
}

/**
 * 添加资源后，增加树形节点数据
 */
function addTreeData(rt: ItreeAsset[], key: string, parentKey: any, item: any) {
    // 找出父级
    const one = deepFindParent(rt, key, item[parentKey]);

    if (one) {
        if (!Array.isArray(one.children)) {
            one.children = [];
        }
        one.children.push(item);

        // 业务逻辑，根据 a/b/c 这种特征，a, b 需要判定为文件夹
        one.isDir = true;
        item.parent = one.uuid;

        sortData(one.children, false);
    } else {
        rt.push(item);
        sortData(rt, false);
    }

}

/**
 * 删除资源后，清除对应树形节点数据
 */
function removeTreeData(uuid: string) {
    const nodeData = getAssetFromTreeData(treeData, uuid);
    const index = nodeData[1];
    nodeData[2].splice(index, 1);
}
/**
 * 从一个扁平的数组的转换为含有 children 字段的树形
 * @param arr
 * @param key 唯一标识的字段
 * @param parentKey 父级的字段名称
 */
function toTreeData(arr: any[], key: string, parentKey: string) {

    const tree = loopOne(loopOne(arr, key, parentKey).reverse(), key, parentKey);
    // 重新排序
    sortData(tree);
    return tree;

    function loopOne(arr: any, key: string, parentKey: string) {
        const rt: ItreeAsset[] = [];

        arr.forEach((item: any) => {
            if (!Array.isArray(item.children)) {
                item.children = [];
            }

            // TODO: 这只是一个临时做法，无法正确识别 a.js 的文件夹
            if (item.filename && !item.fileext) { // 处理空文件夹
                item.isDir = true;
            }

            addTreeData(rt, key, parentKey, item);
        });

        return rt;
    }
}
/**
 * 找出父级，深度查找对应关系，类似 id === parentId 确定子父关系
 * @param arr
 * @param key
 * @param parentValue
 */
function deepFindParent(arr: any[], key: string, parentValue: any) {
    const one: any = arr.find((a) => {
        return a[key] === parentValue;
    });

    if (one) {
        return one;
    }

    for (let i = 0, ii = arr.length; i < ii; i++) {
        const rt: any = deepFindParent(arr[i].children, key, parentValue);
        if (rt) {
            return rt;
        }
    }

    return;
}

/**
 * 目录文件和文件夹排序
 * @param arr
 * @param loop 是否循环子集排序，默认开启
 */
function sortData(arr: ItreeAsset[], loop = true) {
    // @ts-ignore;
    arr.sort((a: ItreeAsset, b: ItreeAsset) => {
        // 文件夹优先
        if (a.isDir === true && !b.isDir) {
            return -1;
        } else if (!a.isDir && b.isDir === true) {
            return 1;
        } else {
            return a.name > b.name;
        }
    });

    if (loop === false) {
        return;
    }
    // 子集也重新排序
    arr.forEach((a: ItreeAsset) => {
        if (a.children) {
            sortData(a.children, loop);
        }
    });
}

/**
 * 初始的请求数据转换为可用的面板树形数据
 * @param arr
 */
function transformData(arr: IsourceAsset[]) {
    return {
        name: 'root',
        filename: 'root',
        fileext: '',
        uuid: 'root',
        children: [
            {
                name: 'assets',
                filename: 'assets',
                fileext: '',
                uuid: 'assets',
                children: toTreeData(legalData(arr), 'source', 'parent'),
                state: '',
                source: '',
                top: 0,
                parent: 'root',
                isDir: true,
                isExpand: true,
            }
        ],
        state: '',
        source: '',
        top: 0,
        parent: '',
        isDir: true,
        isExpand: true,
    };
}

/**
 * 处理原始数据
 * @param arr
 */
function legalData(arr: IsourceAsset[]) {
    return arr.filter((a) => a.source !== '').map((a: IsourceAsset) => {
        const paths: string[] = a.source.split(/\/|\\/);

        // 赋予两个新字段用于子父层级关联
        a.name = paths.pop() || '';
        const [filename, fileext] = a.name.split('.');
        a.filename = filename;
        a.fileext = fileext || '';
        a.parent = paths.join('\\') || 'assets';

        return a;
    });
}

/**
 * 面板内的添加操作，按钮或右击菜单
 * @param uuid 创建的位置
 * @param json
 */
function newAsset(uuid: string, json: IaddAsset) {
    // 获取该资源
    const one = getAssetFromTreeData(treeData, uuid);
    let url = one[0].source;

    if (one[0].isDir !== true) { // 不是目录，指向父级级
        url = one[3].source;
    }

    let content;
    switch (json.type) {
        case 'folder': url += '/New Folder'; break;
        case 'javascript': url += '/NewScript.js'; content = ''; break;
    }

    url = 'db://assets/' + join(url);

    Editor.Ipc.sendToPackage('asset-db', 'create-asset', url, content);
}

/**
 * 外部文件系统拖进资源
 * @param uuid 创建的位置
 * @param path 资源路径
 */
function insertAsset(uuid: string, path: string) {
    Editor.Ipc.sendToPackage('asset-db', 'insert-asset', uuid, path);
}
