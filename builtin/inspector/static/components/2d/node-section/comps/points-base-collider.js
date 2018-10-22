'use strict';

const { readTemplate, T } = require('../../../../utils');

exports.template = readTemplate('2d', './node-section/comps/points-base-collider.html');

exports.components = {
    none: require('./none')
};

exports.props = ['target'];

exports.data = function() {
    return {};
};

exports.methods = {
    T,

    regeneratePoints() {
        // todo
    }
};
