// Bundle local font bytes + their full licenses. This step does not use the network.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.join(__dirname, "../vendor/fonts");
const catalog = JSON.parse(
  fs.readFileSync(path.join(root, "manifest.json"), "utf8"),
);
const fonts = catalog.fonts.map((font) => {
  const bytes = fs.readFileSync(path.join(root, font.file));
  if (crypto.createHash("sha256").update(bytes).digest("hex") !== font.sha256)
    throw new Error("字体校验失败：" + font.file);
  return {
    ...font,
    licenseText: fs.readFileSync(path.join(root, font.license), "utf8"),
    data: `data:font/${font.file.endsWith(".ttf") ? "ttf" : "woff2"};base64,${bytes.toString("base64")}`,
  };
});
fs.writeFileSync(
  path.join(root, "../fonts.js"),
  "/* Fonts licensed under SIL OFL 1.1; complete notices in the catalog and font picker. */\nwindow.WatermarkFonts = " +
    JSON.stringify(fonts).replace(/<\/script/gi, "<\\/script") +
    ";\n",
);
