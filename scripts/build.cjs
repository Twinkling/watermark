const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
async function main() {
  require("./vendor.cjs");
  require("./fonts.cjs");
  await (await import("vite")).build();
  let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  html = html.replace(
    /<link rel="stylesheet" href="styles\.css"\s*\/?>/,
    () =>
      `<style>\n${fs.readFileSync(path.join(root, "styles.css"), "utf8")}\n</style>`,
  );
  html = html.replace(
    '<link rel="stylesheet" href="dist/ui.css" />',
    () =>
      `<style>\n${fs.readFileSync(path.join(root, "dist/ui.css"), "utf8")}\n</style>`,
  );
  for (const file of [
    "src/core.js",
    "src/formats.js",
    "vendor/codecs.js",
    "vendor/fonts.js",
    "src/decode.js",
    "src/studio.js",
    "src/signature.js",
    "dist/ui.js",
  ])
    html = html.replace(
      `<script src="${file}" defer></script>`,
      () =>
        `<script defer>\n${fs.readFileSync(path.join(root, file), "utf8").replace(/<\/script/gi, "<\\/script")}\n</script>`,
    );
  // Inline scripts execute immediately: move them after the complete document body.
  const scripts = [];
  html = html.replace(/<script defer>[\s\S]*?<\/script>/g, (match) => {
    scripts.push(match.replace("<script defer>", "<script>"));
    return "";
  });
  html = html.replace("</body>", () => scripts.join("\n") + "\n</body>");
  if (
    scripts.length !== 8 ||
    /<script[^>]+src=|<link[^>]+rel="stylesheet"/.test(html)
  ) {
    throw new Error("离线构建失败：脚本或样式尚未完全内联。");
  }
  fs.mkdirSync(path.join(root, "dist"), { recursive: true });
  fs.writeFileSync(path.join(root, "dist", "留印.html"), html);
  fs.copyFileSync(
    path.join(root, "LICENSE"),
    path.join(root, "dist", "LICENSE"),
  );
  fs.cpSync(
    path.join(root, "vendor/licenses"),
    path.join(root, "dist/licenses"),
    { recursive: true },
  );
  fs.cpSync(
    path.join(root, "vendor/fonts"),
    path.join(root, "dist/licenses/fonts"),
    { recursive: true, filter: (file) => !/\.(woff2|ttf)$/.test(file) },
  );
  for (const name of ["react", "react-dom", "scheduler", "lucide-react"]) {
    fs.copyFileSync(
      path.join(root, "node_modules", name, "LICENSE"),
      path.join(root, "dist/licenses", name + ".LICENSE"),
    );
  }
  fs.copyFileSync(
    path.join(root, "THIRD-PARTY-NOTICES.md"),
    path.join(root, "dist", "THIRD-PARTY-NOTICES.md"),
  );
  require("./ui-licenses.cjs");
  console.log("已生成 dist/留印.html：单文件，双击即可离线使用。");
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
