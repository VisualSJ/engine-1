'use strict';

import { shell } from 'electron';
import { readFileSync } from 'fs';
import { join } from 'path';
const {getPreviewUrl} = require('./../utils');
export const template = readFileSync(join(__dirname, '../../static/template/components/web-desktop.html'), 'utf8');
export function data() {
    return {
        preview_url: '',
        resolution: {
            width: 1280,
            hright: 960,
        },
    };
}

export const methods = {
    /**
     * 翻译
     * @param key
     */
    t(key: string) {
        const name = `build.${key}`;
        return Editor.I18n.t(name);
    },

    async init() {
        const url = await getPreviewUrl();
        // @ts-ignore
        this.preview_url = join(url, this.info.build_path);
    },

    // 预览该路径地址
    preview() {
        // @ts-ignore
        shell.openExternal(this.preview_url);
    },
};
export const props: object = [
    'info',
];

export function mounted() {
    // @ts-ignore
    this.init();
}

export async function beforeClose() {}

export async function close() {}
