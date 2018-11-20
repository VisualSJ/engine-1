'use strict';

const ipc = require('../../public/ipc/webview');
console.log(require('path').join(__dirname, '../../public/ipc/webview'));
// host 调用 scene 的指定方法
ipc.on('call-method', async (options) => {
    // 防止初始化之前使用接口
    if (!Manager.isReady()) {
        throw new Error(`The scene is not ready.`);
    }

    const mod = Manager[options.module];
    if (!mod) {
        throw new Error(`Module [${options.module}] does not exist.`);
    }
    if (!mod[options.handler]) {
        throw new Error(`Method [${options.handler}] does not exist.`);
    }
    return await mod[options.handler](...options.params);
});

module.exports = ipc;
