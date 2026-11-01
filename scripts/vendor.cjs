/* Reproduce the offline codec bundle from pinned npm packages. */
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const heifPath = "node_modules/heic-to/src/lib/libheif-without-unsafe-eval.js";
const original = read(heifPath);
if (!/export default buildLibheif\s*$/.test(original))
  throw new Error("HEIC 解码器导出结构已改变，请检查集成");
const heif = original.replace(/export default buildLibheif\s*$/, "");
const source = [
  heif,
  read("node_modules/pako/dist/pako_inflate.min.js"),
  read("node_modules/utif/UTIF.js"),
  read("src/formats.js"),
  read("src/codec-worker.js"),
].join("\n;\n");
fs.mkdirSync(path.join(root, "vendor/licenses"), { recursive: true });
fs.writeFileSync(
  path.join(root, "vendor/codecs.js"),
  "/* Bundled local codecs. See THIRD-PARTY-NOTICES.md and vendor/licenses. */\nglobalThis.WatermarkCodecSource = " +
    JSON.stringify(source) +
    ";\n",
);
for (const name of ["heic-to", "utif", "pako"])
  fs.copyFileSync(
    path.join(root, `node_modules/${name}/LICENSE`),
    path.join(root, `vendor/licenses/${name}.txt`),
  );
console.log(
  `已打包本地解码器：${(Buffer.byteLength(source) / 1024 / 1024).toFixed(2)} MB，无 CDN 或动态下载。`,
);
