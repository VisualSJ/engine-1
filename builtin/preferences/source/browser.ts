'use strict';

const profile = Editor.Profile.load('profile://global/packages/preferences.json');
let pkg: any = null;

export const messages = {
    open() {
        Editor.Panel.open('preferences');
    },
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
