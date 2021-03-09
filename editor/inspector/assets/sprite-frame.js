'use strict';

exports.template = `
<div class="asset-sprite-frame">
    <div class="content">
        <ui-prop>
            <ui-label slot="label" value="i18n:ENGINE.assets.spriteFrame.packable" tooltip="i18n:ENGINE.assets.spriteFrame.packableTip"></ui-label>
            <ui-checkbox slot="content" class="packable-checkbox"></ui-checkbox>
        </ui-prop>
        <ui-prop>
            <ui-label slot="label" value="i18n:ENGINE.assets.spriteFrame.rotated" tooltip="i18n:ENGINE.assets.spriteFrame.rotatedTip"></ui-label>
            <ui-checkbox slot="content" disabled class="rotated-checkbox"></ui-checkbox>
        </ui-prop>
        <ui-prop>
            <ui-label slot="label" value="i18n:ENGINE.assets.spriteFrame.offsetX" tooltip="i18n:ENGINE.assets.spriteFrame.offsetXTip"></ui-label>
            <ui-num-input slot="content" disabled class="offsetX-input"></ui-num-input>
        </ui-prop>
        <ui-prop>
            <ui-label slot="label" value="i18n:ENGINE.assets.spriteFrame.offsetY" tooltip="i18n:ENGINE.assets.spriteFrame.offsetYTip"></ui-label>
            <ui-num-input slot="content" disabled class="offsetY-input"></ui-num-input>
        </ui-prop>
        <ui-prop>
            <ui-label slot="label" value="i18n:ENGINE.assets.spriteFrame.trimType" tooltip="i18n:ENGINE.assets.spriteFrame.trimTypeTip"></ui-label>
            <ui-select slot="content" class="trimType-select"></ui-select>
        </ui-prop>
        <ui-prop>
            <ui-label slot="label" value="i18n:ENGINE.assets.spriteFrame.trimThreshold" tooltip="i18n:ENGINE.assets.spriteFrame.trimThresholdTip"></ui-label>
            <ui-num-input slot="content" class="trimThreshold-input"></ui-num-input>
        </ui-prop>
        <ui-prop>
            <ui-label slot="label" value="i18n:ENGINE.assets.spriteFrame.trimX" tooltip="i18n:ENGINE.assets.spriteFrame.trimXTip"></ui-label>
            <ui-num-input slot="content" class="trimX-input"></ui-num-input>
        </ui-prop>
        <ui-prop>
            <ui-label slot="label" value="i18n:ENGINE.assets.spriteFrame.trimY" tooltip="i18n:ENGINE.assets.spriteFrame.trimYTip"></ui-label>
            <ui-num-input slot="content" class="trimY-input"></ui-num-input>
        </ui-prop>
        <ui-prop>
            <ui-label slot="label" value="i18n:ENGINE.assets.spriteFrame.width" tooltip="i18n:ENGINE.assets.spriteFrame.widthTip"></ui-label>
            <ui-num-input slot="content" class="width-input"></ui-num-input>
        </ui-prop>
        <ui-prop>
            <ui-label slot="label" value="i18n:ENGINE.assets.spriteFrame.height" tooltip="i18n:ENGINE.assets.spriteFrame.heightTip"></ui-label>
            <ui-num-input slot="content" class="height-input"></ui-num-input>
        </ui-prop>
        <ui-prop>
            <ui-label slot="label" value="i18n:ENGINE.assets.spriteFrame.borderTop" tooltip="i18n:ENGINE.assets.spriteFrame.borderTopTip"></ui-label>
            <ui-num-input slot="content" class="borderTop-input" min="0"></ui-num-input>
        </ui-prop>
        <ui-prop>
            <ui-label slot="label" value="i18n:ENGINE.assets.spriteFrame.borderBottom" tooltip="i18n:ENGINE.assets.spriteFrame.borderBottomTip"></ui-label>
            <ui-num-input slot="content" class="borderBottom-input" min="0"></ui-num-input>
        </ui-prop>
        <ui-prop>
            <ui-label slot="label" value="i18n:ENGINE.assets.spriteFrame.borderLeft" tooltip="i18n:ENGINE.assets.spriteFrame.borderLeftTip"></ui-label>
            <ui-num-input slot="content" class="borderLeft-input" min="0"></ui-num-input>
        </ui-prop>
        <ui-prop>
            <ui-label slot="label" value="i18n:ENGINE.assets.spriteFrame.borderRight" tooltip="i18n:ENGINE.assets.spriteFrame.borderRightTip"></ui-label>
            <ui-num-input slot="content" class="borderRight-input" min="0"></ui-num-input>
        </ui-prop>
        <ui-prop class="edit-row">
            <ui-button tabindex="0" class="edit-button">
                <ui-label value="i18n:ENGINE.assets.spriteFrame.edit"></ui-label>
            </ui-button>
        </ui-prop>
    </div>
    <div class="preview">
        <ui-image class="preview-image" show-alpha></ui-image>
        <div class="preview-image-label">
            <span class="preview-image-size"></span>
        </div>
    </div>
</div>
`;

exports.style = `
    .asset-sprite-frame { 
        display: flex;
        flex: 1;
        flex-direction: column;
     }
    .asset-sprite-frame > .content {  
        padding-bottom: 15px;
        flex: 1;
    }
    .asset-sprite-frame > .content > ui-prop {
        margin: 4px 0;
    }
    .asset-sprite-frame > .content > .edit-row {
        text-align: center;
        margin-top: 10px;
    }
    .asset-sprite-frame > .preview {
        height: 200px;
        background: var(--color-normal-fill-emphasis);
        border: 1px solid var(--color-normal-border-emphasis);
        display: flex;
        padding: 10px;
        position: relative;
    }
    .asset-sprite-frame > .preview > .preview-image {
        width: 100%;
        height: 100%;
    }
    .asset-sprite-frame > .preview > .preview-image-label {
        position: absolute;
        width: 100%;
        left: 0;
        bottom: 4px;
        text-align: center;
    }
    .asset-sprite-frame > .preview > .preview-image-label > .preview-image-size {
        font-size: 10px;
        padding: 2px 8px;
        background-color: var(--color-primary-fill);
        color: var(--color-primary-contrast-weakest);
        border-radius: calc(var(--size-normal-radius) * 1px);
    }
`;

exports.$ = {
    container: '.asset-sprite-frame',
    packableCheckbox: '.packable-checkbox',
    rotatedCheckbox: '.rotated-checkbox',
    offsetXInput: '.offsetX-input',
    offsetYInput: '.offsetY-input',
    trimTypeSelect: '.trimType-select',
    trimThresholdInput: '.trimThreshold-input',
    trimXInput: '.trimX-input',
    trimYInput: '.trimY-input',
    widthInput: '.width-input',
    heightInput: '.height-input',
    borderTopInput: '.borderTop-input',
    borderBottomInput: '.borderBottom-input',
    borderLeftInput: '.borderLeft-input',
    borderRightInput: '.borderRight-input',
    editButton: '.edit-button',
    image: '.preview-image',
    imageSize: '.preview-image-size',
};

/**
 * 属性对应的编辑元素
 */
const Elements = {
    packable: {
        ready() {
            const panel = this;

            panel.$.packableCheckbox.addEventListener('change', (event) => {
                panel._metaList.forEach((meta) => {
                    meta.userData.packable = event.target.value;
                });
                panel.dispatch('change');
            });
        },
        update() {
            const panel = this;

            panel.$.packableCheckbox.value = panel._meta.userData.packable;

            panel.updateInvalid(panel.$.packableCheckbox, 'packable');
            panel.updateReadonly(panel.$.packableCheckbox);
        },
    },
    rotated: {
        ready() {
            const panel = this;

            panel.$.rotatedCheckbox.addEventListener('change', (event) => {
                panel._metaList.forEach((meta) => {
                    meta.userData.rotated = event.target.value;
                });
                panel.dispatch('change');
            });
        },
        update() {
            const panel = this;

            panel.$.rotatedCheckbox.value = panel._meta.userData.rotated;

            panel.updateInvalid(panel.$.rotatedCheckbox, 'rotated');
        },
    },
    offsetX: {
        ready() {
            const panel = this;

            panel.$.offsetXInput.addEventListener('change', (event) => {
                panel._metaList.forEach((meta) => {
                    meta.userData.offsetX = event.target.value;
                });
                panel.dispatch('change');
            });
        },
        update() {
            const panel = this;

            panel.$.offsetXInput.value = panel._meta.userData.offsetX;

            panel.updateInvalid(panel.$.offsetXInput, 'offsetX');
        },
    },
    offsetY: {
        ready() {
            const panel = this;

            panel.$.offsetYInput.addEventListener('change', (event) => {
                panel._metaList.forEach((meta) => {
                    meta.userData.offsetY = event.target.value;
                });
                panel.dispatch('change');
            });
        },
        update() {
            const panel = this;

            panel.$.offsetYInput.value = panel._meta.userData.offsetY;

            panel.updateInvalid(panel.$.offsetXInput, 'offsetY');
        },
    },
    trimType: {
        ready() {
            const panel = this;

            panel.$.trimTypeSelect.addEventListener('change', (event) => {
                panel._metaList.forEach((meta) => {
                    meta.userData.trimType = event.target.value;
                });
                panel.dispatch('change');

                // 其他项有依赖它的更新，数量较多，所以用了整体 update 一次
                for (const prop in Elements) {
                    const element = Elements[prop];
                    element.update.bind(this)();
                }
            });
        },
        update() {
            const panel = this;

            let optionsHtml = '';
            const types = ['auto', 'custom', 'none'];
            types.forEach((type) => {
                optionsHtml += `<option value="${type}">${type}</option>`;
            });
            panel.$.trimTypeSelect.innerHTML = optionsHtml;

            panel.$.trimTypeSelect.value = panel._meta.userData.trimType;

            panel.updateInvalid(panel.$.trimTypeSelect, 'trimType');
            panel.updateReadonly(panel.$.trimTypeSelect);
        },
    },
    trimThreshold: {
        ready() {
            const panel = this;

            panel.$.trimThresholdInput.addEventListener('change', (event) => {
                panel._metaList.forEach((meta) => {
                    meta.userData.trimThreshold = event.target.value;
                });
                panel.dispatch('change');
            });
        },
        update() {
            const panel = this;

            panel.$.trimThresholdInput.value = panel._meta.userData.trimThreshold;

            panel.updateInvalid(panel.$.trimThresholdInput, 'trimThreshold');
            panel.updateReadonly(panel.$.trimThresholdInput);
        },
    },
    trimX: {
        ready() {
            const panel = this;

            panel.$.trimXInput.addEventListener('change', (event) => {
                panel._metaList.forEach((meta) => {
                    meta.userData.trimX = event.target.value;
                });
                panel.dispatch('change');
            });
        },
        update() {
            const panel = this;

            panel.$.trimXInput.value = panel._meta.userData.trimX;

            panel.updateInvalid(panel.$.trimXInput, 'trimX');
            panel.updateReadonlyCustom(panel.$.trimXInput);
        },
    },
    trimY: {
        ready() {
            const panel = this;

            panel.$.trimYInput.addEventListener('change', (event) => {
                panel._metaList.forEach((meta) => {
                    meta.userData.trimY = event.target.value;
                });
                panel.dispatch('change');
            });
        },
        update() {
            const panel = this;

            panel.$.trimYInput.value = panel._meta.userData.trimY;

            panel.updateInvalid(panel.$.trimYInput, 'trimY');
            panel.updateReadonlyCustom(panel.$.trimYInput);
        },
    },
    width: {
        ready() {
            const panel = this;

            panel.$.widthInput.addEventListener('change', (event) => {
                panel._metaList.forEach((meta) => {
                    meta.userData.width = event.target.value;
                });
                panel.dispatch('change');
            });
        },
        update() {
            const panel = this;

            panel.$.widthInput.value = panel._meta.userData.width;

            panel.updateInvalid(panel.$.widthInput, 'width');
            panel.updateReadonlyCustom(panel.$.widthInput);
        },
    },
    height: {
        ready() {
            const panel = this;

            panel.$.heightInput.addEventListener('change', (event) => {
                panel._metaList.forEach((meta) => {
                    meta.userData.height = event.target.value;
                });
                panel.dispatch('change');
            });
        },
        update() {
            const panel = this;

            panel.$.heightInput.value = panel._meta.userData.height;

            panel.updateInvalid(panel.$.heightInput, 'height');
            panel.updateReadonlyCustom(panel.$.heightInput);
        },
    },
    borderTop: {
        ready() {
            const panel = this;

            panel.$.borderTopInput.addEventListener('change', (event) => {
                panel._metaList.forEach((meta) => {
                    meta.userData.borderTop = event.target.value;
                });
                panel.dispatch('change');
            });
        },
        update() {
            const panel = this;

            panel.$.borderTopInput.value = panel._meta.userData.borderTop;

            panel.updateInvalid(panel.$.borderTopInput, 'borderTop');
            panel.updateReadonly(panel.$.borderTopInput);

            panel.$.borderTopInput.setAttribute('max', this._meta.userData.height - this._meta.userData.borderBottom);
        },
    },
    borderBottom: {
        ready() {
            const panel = this;

            panel.$.borderBottomInput.addEventListener('change', (event) => {
                panel._metaList.forEach((meta) => {
                    meta.userData.borderBottom = event.target.value;
                });
                panel.dispatch('change');
            });
        },
        update() {
            const panel = this;

            panel.$.borderBottomInput.value = panel._meta.userData.borderBottom;

            panel.updateInvalid(panel.$.borderBottomInput, 'borderBottom');
            panel.updateReadonly(panel.$.borderBottomInput);

            panel.$.borderBottomInput.setAttribute('max', this._meta.userData.height - this._meta.userData.borderTop);
        },
    },
    borderLeft: {
        ready() {
            const panel = this;

            panel.$.borderLeftInput.addEventListener('change', (event) => {
                panel._metaList.forEach((meta) => {
                    meta.userData.borderLeft = event.target.value;
                });
                panel.dispatch('change');
            });
        },
        update() {
            const panel = this;

            panel.$.borderLeftInput.value = panel._meta.userData.borderLeft;

            panel.updateInvalid(panel.$.borderLeftInput, 'borderLeft');
            panel.updateReadonly(panel.$.borderLeftInput);

            panel.$.borderLeftInput.setAttribute('max', this._meta.userData.width - this._meta.userData.borderRight);
        },
    },
    borderRight: {
        ready() {
            const panel = this;

            panel.$.borderRightInput.addEventListener('change', (event) => {
                panel._metaList.forEach((meta) => {
                    meta.userData.borderRight = event.target.value;
                });
                panel.dispatch('change');
            });
        },
        update() {
            const panel = this;

            panel.$.borderRightInput.value = panel._meta.userData.borderRight;

            panel.updateInvalid(panel.$.borderRightInput, 'borderRight');
            panel.updateReadonly(panel.$.borderRightInput);

            panel.$.borderRightInput.setAttribute('max', this._meta.userData.width - this._meta.userData.borderLeft);
        },
    },
    editButton: {
        ready() {
            const panel = this;

            this.$.editButton.addEventListener('change', (event) => {
                // TODO: 打开九宫格编辑器
        
                event.stopPropagation();
            });
        },
    },
    imagePreview: {
        ready() {
            const panel = this;

            this.$.image.$img.addEventListener('load', () => {
                this.$.imageSize.innerHTML = `${this.$.image.$img.naturalWidth} x ${this.$.image.$img.naturalHeight}`;
            });
        },
        update() {
            const panel = this;

            this.$.image.value = this._asset.uuid;
        },
    },
};

/**
 * 自动渲染组件的方法
 * @param assetList
 * @param metaList
 */
exports.update = function (assetList, metaList) {
    this._assetList = assetList;
    this._metaList = metaList;
    this._asset = assetList[0];
    this._meta = metaList[0];

    for (const prop in Elements) {
        const element = Elements[prop];
        if (element.update) {
            element.update.bind(this)();
        }
    }
};

/**
 * 初始化界面的方法
 */
exports.ready = function () {
    for (const prop in Elements) {
        const element = Elements[prop];
        if (element.ready) {
            element.ready.bind(this)();
        }
    }
};

exports.methods = {
    /**
     * 更新多选状态下某个数据是否可编辑
     */
    updateInvalid(element, prop) {
        const invalid = this._metaList.some((meta) => {
            return meta.userData[prop] !== this._meta.userData[prop];
        });
        element.invalid = invalid;
    },
    /**
     * 更新只读状态
     */
    updateReadonly(element) {
        if (this._asset.readonly) {
            element.setAttribute('disabled', true);
        } else {
            element.removeAttribute('disabled');
        }
    },
    /**
     * 更新业务相关的只读状态
     */
    updateReadonlyCustom(element) {
        const isCustom = this._meta.userData.trimType === 'custom';

        if (!isCustom || this._asset.readonly) {
            element.setAttribute('disabled', true);
        } else {
            element.removeAttribute('disabled');
        }
    },
};
