const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const config = require('../analytics.config.json');
const source = fs.readFileSync(path.join(root, 'src/analytics.js'), 'utf8')
  .replace('/*__ANALYTICS_CONFIG__*/ null', JSON.stringify(config));

function browser(overrides = {}) {
  const scripts = [], load = [], idle = [];
  const context = {
    location: { protocol: 'https:', hostname: config.hostname,
      origin: 'https://' + config.hostname, pathname: '/', search: '?private=test', hash: '#secret' },
    navigator: {}, URL,
    document: { readyState: 'loading', referrer: 'https://example.com/private?secret=1',
      createElement: () => ({}), head: { appendChild: s => scripts.push(s) } },
    window: {
      addEventListener(event, fn, options) { assert.equal(event, 'load'); assert.equal(options.once, true); load.push(fn); },
      requestIdleCallback(fn) { idle.push(fn); },
      setTimeout(fn) { idle.push(fn); },
    },
    ...overrides,
  };
  vm.createContext(context);
  return { context, scripts, load, idle, run() { vm.runInContext(source, context); } };
}

test('GA4 等待页面 load 和空闲，重复初始化只加载一次，页面信息不包含查询参数', () => {
  const b = browser();
  b.run(); b.run();
  assert.equal(b.scripts.length, 0);
  assert.equal(b.context.window.dataLayer, undefined);
  b.load.forEach(fn => fn());
  assert.equal(b.scripts.length, 0);
  b.idle.forEach(fn => fn());
  assert.equal(b.scripts.length, 1);
  assert.equal(b.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=' + config.measurementId);
  assert.equal(b.scripts[0].async, true);
  const commands = b.context.window.dataLayer.map(v => Array.from(v));
  assert.equal(commands.filter(c => c[0] === 'config').length, 1);
  const c = commands[1];
  assert.equal(c[1], config.measurementId);
  assert.equal(c[2].send_page_view, true);
  assert.equal(c[2].page_location, 'https://' + config.hostname + '/');
  assert.equal(c[2].page_referrer, 'https://example.com');
  assert.equal(c[2].allow_google_signals, false);
  assert.equal(c[2].allow_ad_personalization_signals, false);
});

test('本地、预览域名、file、非 HTTPS 和浏览器隐私选择不启动 GA4', () => {
  for (const overrides of [
    { location: { protocol: 'http:', hostname: 'localhost' } },
    { location: { protocol: 'https:', hostname: 'preview.liuyin-watermark.pages.dev' } },
    { location: { protocol: 'file:', hostname: '' } },
    { location: { protocol: 'http:', hostname: config.hostname } },
    { navigator: { globalPrivacyControl: true } },
    { navigator: { doNotTrack: '1' } },
  ]) {
    const b = browser(overrides); b.run();
    assert.equal(b.load.length, 0);
    assert.equal(b.scripts.length, 0);
    assert.equal(b.context.window.dataLayer, undefined);
  }
});

test('页面已完成加载且不支持 requestIdleCallback 时正常初始化', () => {
  const b = browser();
  b.context.document.readyState = 'complete';
  b.context.document.referrer = '';
  delete b.context.window.requestIdleCallback;
  b.run();
  assert.equal(b.load.length, 0);
  b.idle[0]();
  assert.equal(b.scripts.length, 1);
  assert.equal(b.context.window.dataLayer[1][2].page_referrer, '');
});

test('单文件离线版没有 GA4 加载器或统计网络权限', () => {
  const offline = fs.readFileSync(path.join(root, 'dist/留印.html'), 'utf8');
  assert.doesNotMatch(offline, /googletagmanager\.com|google-analytics\.com|G-R4K57LEBZ9/);
  assert.match(offline, /connect-src 'none'/);
});
