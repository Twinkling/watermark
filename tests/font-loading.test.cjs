const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loader(preview = true) {
  const requests = [], registered = [];
  let fail = false;
  const context = {
    window: { WatermarkFonts: [{ id: 'art_sample', name: '测试字体', data: '/full.woff2',
      ...(preview ? { preview: { data: '/preview.woff2' } } : {}) }] },
    document: { fonts: { add(face) { registered.push(face); } } },
    FontFace: class {
      constructor(family, source) { this.family = family; this.source = source; requests.push(this); }
      async load() { if (fail) throw Error('network'); return this; }
    },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/ui/fonts.js'), 'utf8').replace(/export /g, '');
  vm.runInNewContext(source, context);
  return { ...context, requests, registered, fail(value) { fail = value; } };
}

test('字体卡片只请求小预览；应用时单独等待完整字库，重复使用复用结果', async () => {
  const l = loader();
  const first = l.ensureArtFont('art_sample', true);
  assert.equal(typeof first?.then, 'function', '调用方必须能够等待预览字体加载');
  assert.equal(l.ensureArtFont('art_sample', true), first);
  await first;
  assert.deepEqual(l.requests.map(f => f.source), ['url("/preview.woff2")']);
  assert.equal(l.registered[0].family, 'art_sample_preview');
  await l.ensureArtFont('art_sample');
  await l.ensureArtFont('art_sample');
  assert.deepEqual(l.requests.map(f => f.source), ['url("/preview.woff2")', 'url("/full.woff2")']);
  assert.equal(l.registered[1].family, 'art_sample');
});

test('离线版直接复用内嵌完整字库；失败后可重试，系统字体不发请求', async () => {
  const l = loader(false);
  l.fail(true);
  await assert.rejects(l.ensureArtFont('art_sample', true), /加载失败/);
  assert.equal(l.registered.length, 0);
  l.fail(false);
  await l.ensureArtFont('art_sample', true);
  await l.ensureArtFont('art_sample');
  assert.equal(l.requests.length, 2);
  assert.equal(l.registered[0].family, 'art_sample');
  await l.ensureArtFont('sans');
  assert.equal(l.requests.length, 2);
  await assert.rejects(l.ensureArtFont('art_unknown'), /缺少内置字体/);
});
