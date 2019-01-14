'use strict';

module.exports = {
    title: '偏好设置',
    nav: {
        general: '通用设置',
        data_editor: '数据编辑',
        native_develop: '原生开发环境',
        preview: '预览运行',
    },
    general: {
        language: '编辑器语言',
        step: '数值默认步长',
        theme: '皮肤主题',
        themeColor: '配色主题',
        node_tree: '管理器节点折叠状态',
        expand_all: '全部展开',
        collapse_all: '全部折叠',
        memory_last_state: '记住上一次状态',
    },
    preview: {
        auto_refresh: '自动户刷新已启动的预览',
        preview_browser: '预览使用浏览器',
        simulator_path: '模拟器路径',
        simulator_device_orientation: '模拟器横竖屏设置',
        simulator_resolution: '模拟器分辨率设置',
        customize_resolution: '模拟器自定义分辨率设置',
        simulator_debugger: '开启模拟器调试界面',
        options: {
            default: '默认',
            vertical: '竖屏',
            horizontal: '横屏',
            width: '宽度',
            height: '高度',
        },
        browse: '浏览',
        remove: '移除',
    },
    data_editor: {
        auto_compiler_scripts: '自动编译脚本',
        external_script_editor: '外部脚本编辑器',
        external_picture_editor: '外部图片编辑器',
        picture_editor_placeholder: '添加外部图片编辑器路径',
        browse: '浏览',
        remove: '移除',
        internal: '系统默认',
    },
    native_develop: {
        use_default_js_engine: '使用内置的 JavaScript 引擎',
        js_engine_path: 'JavaScript 引擎路径',
        wechatgame_app_path: 'WechatGame 程序路径',
        ndk_root: 'NDK 路径',
        ndk_placeholder: 'ndk-root 推荐使用 r10e 版本',
        android_sdk_root: 'Android SDK 路径',
        doc_link_title: 'Cocos Framework 配置请参考配置文档',
    },
};
