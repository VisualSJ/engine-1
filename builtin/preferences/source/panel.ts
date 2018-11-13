'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const Vue = require('vue/dist/vue.js');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const LANGUAGE = ['en', 'zh'];

let panel: any = null;

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

export const $ = {
    language: '.language',
    preferences: '.preferences'
};

export const methods = {};

export const messages = {};

export async function ready() {

    // @ts-ignore
    panel = this;

    new Vue({
        el: panel.$.preferences,

        data: {
            tab: 0,
            general: {
                language: 'en',
                themeColor: 'default',
                step:  0.01
            },
            preview: {
                autoRefresh: true,
                previewBrowser: 'default',
                simulatorPath: './builtin/preview/simulator/win32',
                simulatorOrientation: 'vertical',
                simulatorResolution: 'iphone4',
                simulator_width: 960,
                simulator_height: 480,
                simulatorDebugger:  false,
            }
        },

        watch: {
            general: {
                deep: true,
                handler() {
                    // @ts-ignore
                    this.set('language');
                    // @ts-ignore
                    this.set('step');
                    // @ts-ignore
                    this.set('themeColor');
                    // @ts-ignore
                    this.save();
                },
            },
            preview: {
                deep: true,
                handler() {
                    // @ts-ignore
                    this.set('autoRefresh', 'preview');
                    // @ts-ignore
                    this.set('previewBrowser', 'preview');
                    // @ts-ignore
                    this.set('simulatorPath', 'preview');
                    // @ts-ignore
                    this.set('simulatorOrientation', 'preview');
                    // @ts-ignore
                    this.set('simulatorResolution', 'preview');
                    // @ts-ignore
                    this.set('simulatorCustomResolution', 'preview');
                    // @ts-ignore
                    this.set('simulatorDebugger', 'preview');
                    // @ts-ignore
                    this.save();
                }
            }
        },

        components: {
            'content-general': require('../static/components/general'),
            'content-preview': require('../static/components/preview'),
        },

        methods: <any>{
            /**
             * 翻译
             * @param key
             */
            t(key: string) {
                const name = `preferences.${key}`;
                return Editor.I18n.t(name);
            },
            /**
             * 查询项目配置
             * @param {*} key
             */
            async get(key: string, type: string) {
                return await Editor.Ipc.requestToPackage('preferences', 'get-setting', `${type}.${key}`);
            },

            /**
             * 设置项目设置信息
             * @param {*} str
             */
            set(key: string, type: string) {
                Editor.Ipc.sendToPackage('preferences', 'set-setting', `${type}.${key}`, this[type][key]);
            },

            /**
             * 保存项目设置信息
             */
            save() {
                Editor.Ipc.sendToPackage('preferences', 'save-setting');
            },

            async getData(type: string) {
                const keys = Object.keys(this[type]);
                // 利用文件列表，生成 promise 任务，并并行执行
                Promise.all(keys.map((key) => {
                    const value = this.get(key);
                    if (value && typeof(value) !== 'object') {
                        this[type][key] = value;
                    }
                })).catch((error) => {
                    console.log(`get project setting error: ${error}`);
                });
            }
        },
        mounted() {
            this.getData('general');
            this.getData('preview');
        },
    });
}

export async function beforeClose() {}

export async function close() {}
