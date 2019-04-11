'use stirct';

const fs = require('fs');
const path = require('path');
const Base = require('../base');

const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './input.css'), 'utf8')}</style>`;
const CUSTOM_STYLE = `<style id="custom-style"></style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './input.html'), 'utf8')}`;
const instanceArray = [];
let customStyle = '';

class Input extends Base {

    /**
     * 使用第三方提供的样式显示当前的元素
     * @param {file} src
     */
    static importStyle(src) {
        if (!fs.existsSync(src)) {
            return;
        }

        // 读取 css 并缓存到模块变量内
        customStyle = fs.readFileSync(src, 'utf8');

        // 应用到之前所有的模块上
        instanceArray.map((elem) => {
            const $style = elem.shadowRoot.querySelector('#custom-style');
            $style.innerHTML = customStyle;
        });
    }

    /**
     * 监听的 Attribute
     */
    static get observedAttributes() {
        return [
            'disabled',
            'value',
            'placeholder',
            'readonly',
            'password',
            'show-clear',
        ];
    }

    /**
     * Attribute 更改后的回调
     * @param {*} attr
     * @param {*} oldData
     * @param {*} newData
     */
    attributeChangedCallback(attr, oldData, newData) {
        switch (attr) {
            case 'disabled':
                this.$input.disabled = newData !== null;
                break;
            case 'value':
                this.$input.value = newData;
                if (newData !== '' && this['show-clear']) {
                    this.$clear.style.display = 'inline-block';
                } else {
                    this.$clear.style.display = 'none';
                }
                break;
            case 'placeholder':
                this.$input.placeholder = newData;
                break;
            case 'readonly':
                this.$input.readOnly = newData !== null;
                break;
            case 'password':
                this.$input.type = newData !== null ? 'password' : 'text';
                break;
            case 'show-clear':
                if (this.value !== '' && this['show-clear']) {
                    this.$clear.style.display = 'inline-block';
                } else {
                    this.$clear.style.display = 'none';
                }
        }
    }

    ////////////////////////////
    //
    get value() {
        return this.getAttribute('value') || '';
    }

    set value(val) {
        val += '';
        this.setAttribute('value', val);
        if (val !== '' && this['show-clear']) {
            this.$clear.style.display = 'inline-block';
        } else {
            this.$clear.style.display = 'none';
        }
    }

    get placeholder() {
        return this.$input.getAttribute('placeholder');
    }

    set placeholder(val) {
        val += '';
        this.$input.setAttribute('placeholder', val);
    }

    get password() {
        return this.getAttribute('password') !== null;
    }

    set password(val) {
        if (val) {
            this.setAttribute('password', '');
        } else {
            this.removeAttribute('password');
        }
    }

    get 'show-clear'() {
        return this.getAttribute('show-clear') !== null;
    }

    set 'show-clear'(val) {
        if (val) {
            this.setAttribute('show-clear', '');
        } else {
            this.removeAttribute('show-clear');
        }
    }

    /**
     * 构造函数
     */
    constructor() {
        super();
        this.shadowRoot.innerHTML = `${STYLE}${CUSTOM_STYLE}${HTML}`;
        this.$input = this.shadowRoot.querySelector('input');
        this.$clear = this.shadowRoot.querySelector('.clear');

        // 指定会影响tab焦点的内部元素
        this.$child = this.$input;
        this.$input.$root = this.$clear.$root = this;

        this._staging = null;
    }

    /**
     * 插入文档流
     */
    connectedCallback() {
        super.connectedCallback();

        // 缓存元素
        instanceArray.push(this);

        // 插入自定义样式
        const $style = this.shadowRoot.querySelector('#custom-style');
        $style.innerHTML = customStyle;

        // 绑定事件
        this.$input.addEventListener('focus', this._onInputFocus);
        this.$input.addEventListener('blur', this._onInputBlur);
        this.$input.addEventListener('input', this._onInputChange);
        // this.$input.addEventListener('keydown', this._onInputKeyDown);
        this.$clear.addEventListener('click', this._onClear, true);
    }

    /**
     * 移除文档流
     */
    disconnectedCallback() {
        super.disconnectedCallback();

        // 移除缓存的元素对象
        const index = instanceArray.indexOf(this);
        instanceArray.splice(index, 1);

        // 取消绑定事件
        this.$input.removeEventListener('focus', this._onInputFocus);
        this.$input.removeEventListener('blur', this._onInputBlur);
        this.$input.removeEventListener('input', this._onInputChange);
        // this.$input.removeEventListener('keydown', this._onInputKeyDown);
        this.$clear.removeEventListener('click', this._onClear, true);
    }

    // get set focused
    // get set disabled
    // get _shiftFlag

    //////////////////////
    // 私有事件

    /**
     * 获得了焦点
     * 需要将焦点转移到 input 元素上
     * @param {Event} event
     */
    _onFocus(event) {
        super._onFocus(event);
        // 判断是否已按下shift键
        if (this._shiftFlag) {
            return;
        }
        this.$input.focus();
    }

    /**
     * input 获得了焦点
     * 需要记录现在的 value 数据
     */
    _onInputFocus() {
        // 判断是否为可读或禁用
        if (this.disabled || this.readOnly) {
            return;
        }

        this.$root._staging = this.value;
        this.select();
    }

    /**
     * input 丢失焦点
     */
    _onInputBlur() {
        // 判断是否为可读或禁用
        if (this.disabled || this.readOnly) {
            return;
        }

        this.$root._staging = null;
    }

    /**
     * input 被修改
     */
    _onInputChange() {
        // 判断是否为可读或禁用
        if (this.disabled || this.readOnly) {
            return;
        }
        this.$root.value = this.value;
        this.$root.dispatch('change');
    }

    /**
     * input 键盘按下事件
     * @param {Event} event
     */
    _onKeyDown(event) {
        // 判断是否为可读或禁用
        if (this.disabled || this.readOnly) {
            return;
        }

        const inputFocused = this._staging !== null;

        switch (event.keyCode) {
            case 13: // 回车
                // 先判断值是否发生更改
                if (this._staging !== null && this._staging !== this.value) {
                    this._staging = this.value;
                    this.dispatch('confirm');
                }
                if (inputFocused) {
                    this.focus();
                } else {
                    this.$input.focus();
                }
                break;
            case 27: // esc
                // 清除定时器
                clearTimeout(this._timer);
                clearInterval(this._timer);

                // 如果 staging 不存在，或者数据相等
                if (this._staging !== null && this._staging !== this.value) {
                    // 清除数据
                    this.value = this._staging;
                    this._staging = null;

                    this.dispatch('change');
                    this.dispatch('cancel');
                }

                this.focus();
                break;
        }
    }

    _onClear() {
        this.$root.value = '';
        this.$root._onFocus();
        this.style.display = 'none';
        this.$root.dispatch('change');
        this.$root.dispatch('confirm');
    }

    // _onKeyDown
    // _onKeyUp
}

module.exports = Input;
