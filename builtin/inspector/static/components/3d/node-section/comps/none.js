'use strict';

const { readTemplate, getComponentType } = require('../../../../utils');

exports.template = readTemplate('3d', './node-section/comps/none.html');

exports.props = ['target'];

exports.data = function() {
    return {};
};

exports.methods = {
    getComponentType
};
