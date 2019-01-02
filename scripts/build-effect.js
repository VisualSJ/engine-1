const path_ = require('path');
Manager = {};
Manager.AssetInfo = {};
Manager.AssetInfo.engine = path_.join(__dirname, '../resources/3d/engine');

const shdcLib = require('../builtin/asset-db/static/shdc-lib');
shdcLib.addChunksCache('builtin/asset-db/static/chunks');

const fs = require('fs');
const fsJetpack = require('fs-jetpack');

let indent = (str, num) => str.replace(/\n/g, '\n'+' '.repeat(num));
let stringify = function(o) { return JSON.stringify(o).replace(/([,:])/g, '$1 '); }

let stringifyUniforms = function(uniforms) {
  let code = '';
  if (!uniforms.length) return '[]';
  for (let i = 0; i < uniforms.length; ++i) {
    let u = uniforms[i];
    if (u.members) {
      code += `  {"blockName": "${u.blockName}", "defines": ${stringify(u.defines)}, "binding": ${u.binding}, "members": [`;
      code += u.members.map(u => '\n    ' + stringify(u));
      code += '\n  ]},\n';
    } else {
      code += `  ${stringify(u)},\n`;
    }
  }
  return `[\n${code.slice(0, -2)}\n]`;
};

let stringifyShaders = (function() {
  let newlines = /\n+/g;
  let toOneLiner = o => '\n      ' + stringify(o);
  return function (shaders) {
    let code = '';
    for (let i = 0; i < shaders.length; ++i) {
      let { name, cclocals, vert1, frag1, vert, frag, defines, uniforms, attributes, extensions } = shaders[i];
      vert = vert.replace(newlines, '\\n');
      frag = frag.replace(newlines, '\\n');
      vert1 = vert1.replace(newlines, '\\n');
      frag1 = frag1.replace(newlines, '\\n');
      code += '  {\n';
      code += `    "name": "${name}",\n`;
      code += `    "cclocals": "${cclocals}",\n`;
      code += `    "vert1": "${vert1}",\n`;
      code += `    "frag1": "${frag1}",\n`;
      code += `    "vert": "${vert}",\n`;
      code += `    "frag": "${frag}",\n`;
      code += '    "defines": [';
      code += defines.map(toOneLiner);
      code += (defines.length ? '\n    ' : '') + '],\n';
      code += `    "uniforms": ${indent(stringifyUniforms(uniforms), 4)},\n`;
      code += '    "attributes": [';
      code += attributes.map(toOneLiner);
      code += (attributes.length ? '\n    ' : '') + '],\n';
      code += '    "extensions": [';
      code += extensions.map(toOneLiner);
      code += (extensions.length ? '\n    ' : '') + ']\n';
      code += '  },\n';
    }
    return `[\n${code.slice(0, -2)}\n]`;
  };
})();

let path = 'builtin/asset-db/static/internal/assets';
let files = fsJetpack.find(path, { matching: ['**/*.effect'] }), code = ``;
for (let i = 0; i < files.length; ++i) {
  let name = path_.basename(files[i], '.effect');
  let content = fs.readFileSync(files[i], { encoding: 'utf8' });
  let effect = shdcLib.buildEffect(name, content);
  code += '  {\n';
  code += `    "name": "${effect.name}",\n`;
  code += `    "techniques": ${stringify(effect.techniques)},\n`;
  code += `    "properties": ${stringify(effect.properties || {})},\n`;
  code += `    "shaders": ${indent(stringifyShaders(effect.shaders), 4)}\n`;
  code += '  },\n';
}
fs.writeFileSync('effects.js', `export default [\n${code.slice(0, -2)}\n];\n`, { encoding: 'utf8' });
