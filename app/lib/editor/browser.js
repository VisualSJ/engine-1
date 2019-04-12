'use strict';

const path = require('path');

const setting = require('@editor/setting');

// 在 logger 启动前打印相应的启动数据
console.log('Arguments:');
Object.keys(setting.args).forEach((key) => {
    console.log(`  ${key}: ${setting.args[key]}`);
});
console.log(' ');

exports.Startup = require('../startup');

exports.Task = require('../task');
exports.Profile = require('../profile');
exports.Theme = require('../theme');
// 本地化翻译组件需要先加载，其他组件才能够获取数据
exports.I18n = require('../i18n');
// menu 需要初始化主菜单，需要在其他用到菜单的组件之前加载
exports.Menu = require('../menu');
exports.Dialog = require('../dialog');
exports.Package = require('../package');
exports.Layout = require('../layout');
exports.Panel = require('../panel');
exports.Ipc = require('../ipc');
exports.UI = require('../ui-kit');
exports.Logger = require('../logger');
exports.Project = require('../project');
exports.Utils = require('../utils');
exports.Selection = require('../selection');

exports.dev = setting.dev;

exports.App = {
    get home() {
        return setting.PATH.HOME;
    },
    get path() {
        // HACK electron 启动后，process.cwd 获取的路径是错误的额
        // if (setting.PATH.APP === '/') {
            return path.join(__dirname, '../../');
        // }
        // return setting.PATH.APP;
    },
    get project() {
        return setting.PATH.PROJECT;
    },
};
