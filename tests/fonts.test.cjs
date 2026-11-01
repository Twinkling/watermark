const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const E = require('../src/studio.js');
const root = path.join(__dirname, '../vendor/fonts');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

test('内置字体文件完整，发行字体包保留全部字体与版权授权', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, '../fonts.js'), 'utf8'), context);
  const packed = context.window.WatermarkFonts;
  assert.equal(packed.length, 12);
  const offline = fs.readFileSync(path.join(__dirname, '../dist/留印.html'), 'utf8');
  for (const font of manifest.fonts) {
    const bytes = fs.readFileSync(path.join(root, font.file));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), font.sha256);
    const entry = packed.find((f) => f.id === font.id);
    assert.ok(entry.licenseText.includes('SIL OPEN FONT LICENSE Version 1.1'));
    assert.ok(entry.licenseText.includes('Copyright'));
    assert.deepEqual(Buffer.from(entry.data.split(',')[1], 'base64'), bytes);
    if (['art_dancingscript', 'art_sacramento'].includes(font.id)) assert.equal(font.sha256, font.sourceSha256);
    assert.ok(offline.includes(font.sha256));
  }
});

test('内置字体可以往返文档与模板，未知字体不会进入 Canvas 字体参数', () => {
  for (const font of manifest.fonts) {
    const doc = E.defaults(); doc.layers[0].font = font.id;
    assert.equal(E.normalize(JSON.parse(JSON.stringify(doc))).layers[0].font, font.id);
  }
  const doc = E.defaults(); doc.layers[0].font = 'art_missing';
  assert.equal(E.normalize(doc).layers[0].font, 'sans');
});
