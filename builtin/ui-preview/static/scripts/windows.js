'use stirct';

const ps = require('path');

exports.load = function() {
    // HACK: 每个窗口自己注册自己的 uuid 翻译方法
    Editor.UI.DragObject.setNameTranslator(async (uuid) => {
        // 资源
        if (uuid && uuid.length > 22) {
            try {
                const info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
                if (!info) {
                    return uuid;
                }
                if (info.source) {
                    return ps.basename(info.source);
                }
                const arr = uuid.split('@');
                return arr[arr.length - 1];
            } catch (error) {}
            return uuid;
        }

        // 节点
        try {
            const info = await Editor.Ipc.requestToPackage('scene', 'query-node', uuid);
            if (!info) {
                return uuid;
            }
            return info.name.value;
        } catch (error) {}
        return uuid;
    });

    // 闪烁对应面板的资源
    // Editor.UI.DragObject.setFocusedAction((uuid) => {
    //     if (uuid && uuid.length > 22) { // 资源
    //          Editor.Ipc.sendToPanel('assets', 'twinkle', uuid);
    //     } else { // 节点
    //         Editor.Ipc.sendToPanel('hierarchy', 'twinkle', uuid);
    //     }
    // });
};
