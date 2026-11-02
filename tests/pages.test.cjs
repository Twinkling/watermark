const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
execFileSync(process.execPath, [path.join(root, 'scripts/build-pages.cjs')]);
const output = path.join(root, '.pages-dist');
const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
const refs = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g)].map(m => m[1]);

test('Pages 首屏不下载字体二进制或特殊格式解码器，总资源小于 800 KB', () => {
  assert.equal(refs.length, 0, '冷启动不应再串行请求 JS / CSS');
  let bytes = Buffer.byteLength(html);
  for (const ref of refs) {
    assert.match(ref, /\.[a-f0-9]{16}\.(js|css)$/);
    assert.doesNotMatch(ref, /\/codecs\.|\.(woff2|ttf)$/);
    bytes += fs.statSync(path.join(output, ref)).size;
  }
  assert.ok(bytes < 800 * 1024, `首屏资源过大：${bytes}`);
  const codec = html.match(/WatermarkCodecURL = "([^"]+)"/)[1];
  assert.ok(fs.existsSync(path.join(output, codec)));
  assert.equal(fs.existsSync(path.join(output, 'vendor/fonts.js')), false);
});

test('在线字体目录的全部字库和许可完整，字节与离线源一致', () => {
  const catalog = fs.readdirSync(path.join(output, 'assets')).find(file => /^fonts\./.test(file));
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(output, 'assets', catalog), 'utf8'), context);
  const fonts = context.window.WatermarkFonts;
  assert.equal(fonts.length, 12);
  for (const font of fonts) {
    assert.match(font.data, /^\/assets\/[^/]+\.[a-f0-9]{16}\.(woff2|ttf)$/);
    const bytes = fs.readFileSync(path.join(output, font.data));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), font.sha256);
    assert.match(font.licenseText, /SIL OPEN FONT LICENSE/);
    assert.match(font.preview.data, /^\/assets\/[^/]+\.preview\.[a-f0-9]{16}\.woff2$/);
    const preview = fs.readFileSync(path.join(output, font.preview.data));
    assert.equal(crypto.createHash('sha256').update(preview).digest('hex'), font.preview.sha256);
    assert.equal(font.preview.text, font.sample);
    assert.equal(font.preview.sourceSha256, font.sha256);
    assert.notEqual(font.preview.data, font.data);
  }
  const chinese = fonts.filter(font => font.category.startsWith('中文'));
  assert.ok(chinese.reduce((sum, font) => sum + font.preview.bytes, 0) < 100 * 1024,
    '打开中文字体面板的预览流量不应超过 100 KiB');
  assert.match(fs.readFileSync(path.join(output, '_headers'), 'utf8'), /\/assets\/\*\n  Cache-Control: public, max-age=31536000, immutable/);
});
