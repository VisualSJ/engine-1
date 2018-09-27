'use strict';

const path = require('path');
const fse = require('fs-extra');
const request = require('request');

exports.template = fse.readFileSync(path.join(__dirname, '../template/engine.html'), 'utf8');

exports.props = [
    'pt', // project type
    'current',
    'type',
];

exports.data = function() {
    // 获取版本列表
    let list = fse.readJSONSync(path.join(__dirname, '../version.json'));

    // 填充版本的数据
    // ~/.CocosEditor3D/engine/2d/2.0.1
    Object.keys(list).forEach((type) => {
        const root = path.join(Editor.App.home, './engine', type);
        list[type].forEach((item) => {
            // 填充 exists - 是否存在(内置引擎版本认为一定存在))
            item.exists = item.builtin || fse.existsSync(path.join(root, `${item.version}.js`));

            // 填充 download - 是否处于下载状态
            item.download = false;
        });
    });

    return { list };
};

exports.methods = {

    /**
     * 点击了下载引擎
     */
    _onClickDownload(event, item) {
        const root = path.join(Editor.App.home, './engine', this.type);
        const file = path.join(root, `${item.version}.js`);
        fse.ensureDirSync(root);
        item.download = true;
        request(item.url)
            .pipe(fse.createWriteStream(file))
            .on('close', () => {
                item.download = false;
                item.exists = fse.existsSync(file);
            });
    },

    /**
     * 点击了使用某个版本的引擎
     */
    _onClickUseEngine(event, item) {
        this.current[this.type] = item.version;
    },
};

exports.mounted = function() {
    // debugger;
};
