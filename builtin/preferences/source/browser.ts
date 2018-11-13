'use strict';

const profile = Editor.Profile.load('profile://global/packages/preferences.json');
let pkg: any = null;

export const messages = {
    open() {
        Editor.Panel.open('preferences');
    },
    /**
     * 查询记录的项目设置信息
     * @param {string} key
     */
    'get-setting'(key: string) {
        return profile.get(key);
    },

    /**
     * 设置项目设置
     * @param {string} key
     */
    'set-setting'(key: string, value: any) {
        profile.set(key, value);
    },

    // 保存设置信息
    'save-setting'() {
        profile.save();
    }
};

export function load() {
    // @ts-ignore
    pkg = this;

    // 应用语言
    const language = profile.get('general.language') || 'en';
    Editor.I18n.switch(language);

    // 应用皮肤
    const theme = profile.get('general.theme') || '';
    Editor.Theme.use(theme);

    // 应用皮肤主题
    // const color = profile.get('themeColor') || 'default';
    // Editor.Theme.useColor(color);
}

export function unload() {}
