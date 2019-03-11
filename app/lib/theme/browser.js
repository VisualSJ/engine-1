'use strict';

const { EventEmitter } = require('events');
const ipc = require('@base/electron-base-ipc');
const ps = require('path');
const fs = require('fs');
const window = require('./../windows'); // 不可删除

/**
 * 皮肤管理器
 * 根据传入的文件夹，查找内部的 css 文件
 * 按文件名注入到指定的 shadowDOM 内
 */
class Theme extends EventEmitter {

    constructor() {
        super();
        this._path = '';
        this._name = 'default';
    }

    /**
     * 使用某个皮肤包
     * @param {string} stylePath 皮肤文件所在的文件夹
     */
    use(path) {
        if (!path) {
            path = ps.join(__dirname, '/dist/default');
        }

        this._path = path;

        //更换主题皮肤路径，通知窗口
        ipc.broadcast('editor3d-lib-theme:use', this._path);
    }

    /**
     * 使用某个内置配色方案
     * @param {*} name 配色方案名称
     * @memberof Theme 主题管理器
     */
    useColor(name) {
        let path = ps.join(__dirname, 'color/', name + '.json');
        if (!fs.existsSync(path)) {
            console.warn('There is no color scheme named' + name);
            return;
        }
        this._name = name;
        //更换主题配色，通知窗口
        ipc.broadcast('editor3d-lib-window:use-color', path);
    }
}

module.exports = new Theme();

module.exports.use('');

ipc.on('editor3d-lib-theme:use', (event, path) => {
    module.exports.use(path);
});

// 监听render进程的请求皮肤路径
ipc.on('editor3d-lib-theme:get', (event) => {
    event.reply(null, module.exports._path);
});
