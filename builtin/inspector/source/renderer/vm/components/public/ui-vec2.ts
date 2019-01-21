'use strict';

export const template = `
<div class="ui-vec2">
    <ui-number name="X"
        v-model="value.x"
    ></ui-number>
    <ui-number name="Y"
        v-model="value.y"
    ></ui-number>
</div>
`;

export const props = [
    'value',
];

export const components = {
    'ui-number': require('./ui-number'),
};

export const methods = {};

export const watch = {};

export function data() {
    return {};
}

export function mounted() {}
