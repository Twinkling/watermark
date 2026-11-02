// Publish only browser runtime assets; keep the standalone offline build separate.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
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
// The online edition ships a tiny catalog, not base64-encoded copies of every font.
const assets = path.join(output, "assets");
fs.mkdirSync(assets);
function asset(name, bytes) {
  const hash = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  const ext = path.extname(name);
  const filename = `${path.basename(name, ext)}.${hash}${ext}`;
  fs.writeFileSync(path.join(assets, filename), bytes);
  return "/assets/" + filename;
}
const catalog = JSON.parse(fs.readFileSync(path.join(root, "vendor/fonts/manifest.json"), "utf8"));
const fonts = catalog.fonts.map(font => ({
  ...font,
  licenseText: fs.readFileSync(path.join(root, "vendor/fonts", font.license), "utf8"),
  data: asset(font.file, fs.readFileSync(path.join(root, "vendor/fonts", font.file))),
  preview: (() => {
    const preview = font.preview;
    const bytes = fs.readFileSync(path.join(root, "vendor/fonts", preview.file));
    if (crypto.createHash("sha256").update(bytes).digest("hex") !== preview.sha256 || preview.text !== font.sample || preview.sourceSha256 !== font.sha256)
      throw new Error("字体预览过期或校验失败，请重新运行 scripts/font-previews.py：" + font.id);
    return { ...preview, data: asset(preview.file, bytes) };
  })(),
}));
const fontCatalog = asset("fonts.js", Buffer.from("window.WatermarkFonts = " + JSON.stringify(fonts).replace(/<\/script/gi, "<\\/script") + ";\n"));
const codecs = asset("codecs.js", fs.readFileSync(path.join(root, "vendor/codecs.js")));
let html = fs.readFileSync(path.join(output, "index.html"), "utf8")
  .replace('<script src="vendor/codecs.js" defer></script>', `<script>window.WatermarkCodecURL = ${JSON.stringify(codecs)};</script>`)
  .replace('src="vendor/fonts.js"', `src="${fontCatalog}"`);
// Cold visits should not wait for another network round trip to start the editor.
// Inline only the critical runtime; large fonts and codecs remain lazy assets.
html = html.replace(/<link rel="stylesheet" href="([^"]+)"\s*\/>/g, (_, file) =>
  `<style>${fs.readFileSync(path.join(root, file), "utf8")}</style>`);
const scripts = [];
html = html.replace(/<script src="([^"]+)" defer><\/script>/g, (_, file) => {
  const bytes = file.startsWith("/assets/")
    ? fs.readFileSync(path.join(output, file))
    : fs.readFileSync(path.join(root, file));
  scripts.push(bytes.toString().replace(/<\/script/gi, "<\\/script"));
  return "";
});
html = html.replace("</body>", () => `<script>${scripts.join("\n;\n")}</script>\n</body>`);
fs.writeFileSync(path.join(output, "index.html"), html);
// Remove the unversioned copies; only the hashed runtime assets are published.
for (const dir of ["src", "dist", "vendor"]) fs.rmSync(path.join(output, dir), { recursive: true, force: true });
fs.rmSync(path.join(output, "styles.css"));
fs.writeFileSync(path.join(output, "_headers"),
  "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n");
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
