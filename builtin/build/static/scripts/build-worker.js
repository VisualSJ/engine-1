const editor = require('./editor'); // editor 要放在最前面
const builder = require('./builder');

const {initInfo, getModules, getCurrentScene} = require('./utils');
const {join} = require('path');
const buildTask = []; // 构建任务列表
const BUILD_INFO = {
    engine: '', // 引擎路径
    type: '', // 项目类型(2d/3d)
    utils: '', // 引擎工具类路径
    project: '', // 项目路径
    version: '', // 引擎版本
    app: '', // 项目路径
};

window.Manager = {
    BUILD_INFO,
};
// 通知 worker 正在启动
Worker.Ipc.send('build-worker:startup');

// 主进程来的初始化数据
Worker.Ipc.on('build-worker:init', async (event, info) => {
    Object.assign(BUILD_INFO, info);
    editor._serialize = function() {
        return require(info.utils + '/serialize');
    };
    editor._uuidUtils = function() {
        const utils = require(info.utilPath);
        return utils.Uuid;
    };
    window.Editor = editor;
    // 加载引擎
    require(join(info.engine, './bin/.cache/dev'));
    initInfo(BUILD_INFO);
});

// 构建打包项目,允许当前有针对不同平台的打包任务，但在同一平台的打包在未完成之前不可新建打包任务
Worker.Ipc.on('build-worker:build', async (event, options) => {
    // 当前存在未完成的构建任务，则将新任务添加进入构建列表
    if (builder.state && builder.state < 100) {
        buildTask.push(options);
        return;
    }
    builder.build(options, BUILD_INFO);
});

// 构建 setting 信息
Worker.Ipc.on('build-worker:build-setting', async (event, options, config) => {
    let setting;
    try {
         setting = await builder.buildSetting(options, config);
    } catch (error) {
        console.error(error);
        event.reply(null, null);
    }
    event.reply(null, setting);
});

// 构建脚本模块信息，添加头尾部
Worker.Ipc.on('build-worker:get-modules', async (event, path) => {
    let content;
    try {
        content = await getModules(path);
    } catch (error) {
        console.error(error);
        event.reply(null, null);
    }
    event.reply(null, content);
});

// 查询当前场景信息
Worker.Ipc.on('build-worker:get-current-scene', async (event, uuid) => {
    const content = await getCurrentScene(uuid);
    event.reply(null, content);
});
