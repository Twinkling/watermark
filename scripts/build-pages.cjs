// Publish only browser runtime assets; keep the standalone offline build separate.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const output = path.join(root, ".pages-dist");
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
const files = [
  "index.html", "styles.css", "dist/ui.js", "dist/ui.css",
  "src/core.js", "src/formats.js", "src/decode.js", "src/studio.js",
  "src/signature.js", "vendor/codecs.js", "vendor/fonts.js",
  "LICENSE", "NOTICE.md", "THIRD-PARTY-NOTICES.md",
];
for (const file of files) {
  const target = path.join(output, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, file), target);
}
fs.cpSync(path.join(root, "dist/licenses"), path.join(output, "licenses"), { recursive: true });
fs.writeFileSync(path.join(output, "_headers"),
  "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n");
// Opt out of Pages' implicit SPA fallback; missing assets should return a real 404.
fs.writeFileSync(path.join(output, "404.html"),
  '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>页面不存在 · 留印</title><h1>页面不存在</h1><a href="/">返回留印工作台</a></html>\n');
function verify(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) verify(file);
    else if (fs.statSync(file).size > 25 * 1024 * 1024)
      throw new Error(`超过 Pages 25 MiB 单文件限制：${file}`);
  }
}
verify(output);
console.log("已生成 .pages-dist/：纯静态 Pages 站点，无 Functions 或后端。");
