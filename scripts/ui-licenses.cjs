// Preserve complete runtime dependency notices in the offline distribution.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const destination = path.join(root, "dist/licenses/ui");
fs.mkdirSync(destination, { recursive: true });
const visited = new Set(),
  manifest = [];
function collect(name) {
  if (visited.has(name)) return;
  visited.add(name);
  const directory = path.join(root, "node_modules", name);
  const pkg = JSON.parse(
    fs.readFileSync(path.join(directory, "package.json"), "utf8"),
  );
  const licenses = fs
    .readdirSync(directory)
    .filter((file) => /^(license|licence|copying)(\.|$)/i.test(file));
  const fallback = path.join(
    root,
    "vendor/licenses/ui",
    `${name.replace("/", "__")}.LICENSE`,
  );
  if (!licenses.length && !fs.existsSync(fallback))
    throw new Error(`Missing license: ${name}`);
  const folder = path.join(destination, name.replace("/", "__"));
  fs.mkdirSync(folder, { recursive: true });
  for (const file of licenses)
    fs.copyFileSync(path.join(directory, file), path.join(folder, file));
  if (!licenses.length) {
    fs.copyFileSync(fallback, path.join(folder, "LICENSE"));
    licenses.push("LICENSE");
  }
  manifest.push({
    name,
    version: pkg.version,
    license: pkg.license,
    files: licenses.map((file) => `${name.replace("/", "__")}/${file}`),
  });
  for (const dependency of Object.keys(pkg.dependencies || {}))
    collect(dependency);
}
const dependencies = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
).dependencies;
for (const name of Object.keys(dependencies).filter(
  (name) => !["heic-to", "utif", "pako"].includes(name),
))
  collect(name);
fs.copyFileSync(
  path.join(root, "src/components/ui/LICENSE.md"),
  path.join(destination, "shadcn-ui.LICENSE.md"),
);
fs.copyFileSync(
  path.join(root, "src/components/ui/sources.json"),
  path.join(destination, "shadcn-ui-sources.json"),
);
fs.writeFileSync(
  path.join(destination, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
