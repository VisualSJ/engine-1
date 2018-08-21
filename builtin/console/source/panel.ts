'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

let panel: any = null;
let vm: any = null;
const manager = require('./manager');
const Vue = require('vue/dist/vue.js');

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(
    join(__dirname, '../static', '/template/index.html')
);
/**
 * 配置 console 的 iconfont 图标
 */
export const fonts = [
    {
        name: 'console',
        file: 'packages://console/static/iconfont.woff'
    }
];
export const $ = {
    'console-panel': '.console-panel'
};

export const methods = {
    /**
     * 刷新显示面板
     * 查询对应选中的对象的信息
     */
    async record(log: string) {
        manager.addItem(log);
    }
};

export const messages = {};

export const listeners = {
    /**
     * 窗口缩放时调用更新
     */
    resize() {
        manager.update();
    },
    /**
     * 窗口显示时调用更新
     */
    show() {
        manager.update();
    }
};

export async function ready() {
    // @ts-ignore
    panel = this;
    vm = new Vue({
        el: panel.$['console-panel'],
        data() {
            return {
                change: false,
                fontSize: 14,
                lineHeight: 26
            };
        },
        methods: <any>{
            update() {
                if (!this.change) {
                    this.change = true;
                }
            },
            onClear() {
                manager.clear();
            },
            onCollapse(event: any) {
                manager.setCollapse(event.target.checked);
            },
            onFilterRegex(event: any) {
                manager.setFilterRegex(event.target.checked);
            },
            onFilterText(event: any) {
                manager.setFilterText(event.target.value);
            }
        },
        components: {
            'console-list': require('./components/list')
        }
    });
    manager.setUpdateFn(vm.update);
    manager.setLineHeight(vm.lineHeight);
    const list = Editor.Logger.query();
    manager.addItems(list);
    Editor.Logger.on('record', panel.record);
}

export async function beforeClose() {}

export async function close() {
    manager.setUpdateFn(null);
    Editor.Logger.removeListener('record', panel.record);
}
