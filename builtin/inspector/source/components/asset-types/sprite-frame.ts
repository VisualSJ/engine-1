'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

export const template = readFileSync(join(__dirname, '../../../static/template/sprite-frame.html'), 'utf8');

export const props: string[] = ['meta'];

export const components = {
    'meta-header': require('../common/meta-header'),
    'sprite-section': require('../common/sprite-section'),
    'image-preview': require('../common/image-preview')
};

export const methods = {};
