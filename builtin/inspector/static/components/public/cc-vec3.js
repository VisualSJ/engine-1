'use strict';

exports.template = `
<div :class="{'cc-vec3': true, 'vue-comp-ui': true, 'flex-wrap': !!$slots.child}">
    <div class="name">
        <span :style="paddingStyle">{{name ? name : 'Unknown'}}</span>
    </div>
    <div class="value" v-if="dump">
        <span>X</span>
        <ui-num-input
            :value="dump ? dump.value.x : 0"
            :disabled="disabled"
            @confirm.stop="_onXConfirm"
        ></ui-num-input>
        <span>Y</span>
        <ui-num-input
            :value="dump ? dump.value.y : 0"
            :disabled="disabled"
            @confirm.stop="_onYConfirm"
        ></ui-num-input>
        <span>Z</span>
        <ui-num-input
            :value="dump ? dump.value.z : 0"
            :disabled="disabled"
            @confirm.stop="_onZConfirm"
        ></ui-num-input>
        <slot name="suffix"></slot>
        <slot name="sibling"></slot>
    </div>


    <div class="value" v-else>
        <span>X</span>
        <ui-num-input
            :value="metaVal ? metaVal.x : 0"
            :disabled="disabled"
            @confirm.stop="_onXConfirm"
        ></ui-num-input>
        <span>Y</span>
        <ui-num-input
            :value="metaVal ? metaVal.y : 0"
            :disabled="disabled"
            @confirm.stop="_onYConfirm"
        ></ui-num-input>
        <span>Z</span>
        <ui-num-input
            :value="metaVal ? metaVal.z : 0"
            :disabled="disabled"
            @confirm.stop="_onZConfirm"
        ></ui-num-input>
        <slot name="suffix"></slot>
        <slot name="sibling"></slot>
    </div>
    <slot name="child"></slot>
</div>
`;

exports.props = [
    'name',
    'dump', // dump 数据
    'indent', // 是否需要缩进
    'meta',
    'path',
    'disabled'
];

exports.data = function() {
    return {
        paddingStyle:
            this.indent !== undefined
                ? {
                      'padding-left': `${this.indent * 13}px`
                  }
                : ''
    };
};

exports.computed = {
    metaVal: {
        get() {
            if (this.path) {
                return (this.path + '').split('.').reduce((prev, next) => {
                    if (prev) {
                        try {
                            return prev[next];
                        } catch (err) {
                            console.error(err);
                            return void 0;
                        }
                    }
                }, this.meta);
            }
        },
        set(newVal) {
            if (this.path) {
                const paths = (this.path + '').split('.');
                const key = paths.pop();
                const target = paths.reduce((prev, next) => {
                    if (prev) {
                        try {
                            return prev[next];
                        } catch (err) {
                            console.error(err);
                            return void 0;
                        }
                    }
                }, this.meta);
                if (target) {
                    target.hasOwnProperty(key) ? (target[key] = newVal) : this.$set(target, key, newVal);
                }
            }
        }
    }
};

exports.methods = {
    /**
     * 向上传递修改事件
     */
    dispatch() {
        const eventType = this.dump ? 'property-changed' : 'meta-changed';
        const evt = document.createEvent('HTMLEvents');
        evt.initEvent(eventType, true, true);
        this.$el.dispatchEvent(evt);
    },

    /**
     * x 值修改
     */
    _onXConfirm(event) {
        const target = this.dump ? this.dump.value : this.metaVal;
        target.x = event.target.value;
        this.dispatch();
    },

    /**
     * y 值修改
     */
    _onYConfirm(event) {
        const target = this.dump ? this.dump.value : this.metaVal;
        target.y = event.target.value;
        this.dispatch();
    },

    /**
     * z 值修改
     */
    _onZConfirm(event) {
        const target = this.dump ? this.dump.value : this.metaVal;
        target.z = event.target.value;
        this.dispatch();
    }
};
