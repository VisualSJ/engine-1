'use strict';
import { join } from 'path';
const { shell } = require('electron');
const utils = require('./tree-utils');

exports.menu = (self: any, asset: ItreeAsset) => {
    Editor.Menu.popup({
        menu: [
            {
                label: Editor.I18n.t('assets.menu.new'),
                enabled: !utils.canNotPasteAsset(asset),
                submenu: [
                    {
                        label: Editor.I18n.t('assets.menu.newFolder'),
                        click() {
                            self.$emit('ipcAdd', { ext: 'folder' }, asset.uuid);
                        }
                    },
                    {
                        type: 'separator'
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newJavaScript'),
                        click() {
                            self.$emit('ipcAdd', { ext: 'js' }, asset.uuid);
                        }
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newTypeScript'),
                        click() {
                            self.$emit('ipcAdd', { ext: 'ts' }, asset.uuid);
                        }
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newCoffeeScript'),
                        click() {
                            self.$emit('ipcAdd', { ext: 'coffee' }, asset.uuid);
                        }
                    },
                    {
                        type: 'separator'
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newScene'),
                        click() {
                            self.$emit('ipcAdd', { ext: 'fire' }, asset.uuid);
                        }
                    },
                    {
                        type: 'separator'
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newAnimationClip'),
                        click() {
                            self.$emit('ipcAdd', { ext: 'anim' }, asset.uuid);
                        }
                    },
                    {
                        type: 'separator'
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newAutoAtlas'),
                        click() {
                            self.$emit('ipcAdd', { ext: 'pac' }, asset.uuid);
                        }
                    },
                    {
                        type: 'separator'
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newLabelAtlas'),
                        click() {
                            self.$emit('ipcAdd', { ext: 'labelatlas' }, asset.uuid);
                        }
                    },
                ]
            },
            {
                type: 'separator'
            },
            {
                label: Editor.I18n.t('assets.menu.copy'),
                enabled: !utils.canNotCopyAsset(asset),
                click() {
                    self.$emit('copy', asset.uuid);
                }
            },
            {
                label: Editor.I18n.t('assets.menu.paste'),
                enabled: !utils.canNotPasteAsset(asset),
                click() {
                    self.$emit('paste', asset.uuid);
                }
            },
            {
                type: 'separator'
            },
            {
                label: Editor.I18n.t('assets.menu.rename'),
                enabled: !utils.canNotRenameAsset(asset),
                click(event: Event) {
                    self.rename(asset);
                }
            },
            {
                label: Editor.I18n.t('assets.menu.delete'),
                enabled: !utils.canNotDeleteAsset(asset),
                click() {
                    self.$emit('ipcDelete', asset.uuid);
                }
            },
            { type: 'separator', },
            {
                label: Editor.I18n.t('assets.menu.revealInlibrary'),
                click() {
                    const path = asset.files[0];
                    if (path) {
                        shell.showItemInFolder(path);
                    }
                },
            },
            {
                label: Editor.I18n.t('assets.menu.revealInExplorer'),
                click() {
                    const path = join(Editor.Project.path, asset.source.substr(5));
                    shell.showItemInFolder(path);
                },
            },
            {
                label: Editor.I18n.t('assets.menu.showUuid'),
                click() {
                    console.info(`UUID: ${asset.uuid}, PATH: ${asset.source}`);
                },
            },
        ]
    });
};
