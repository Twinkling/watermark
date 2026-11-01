// Reproducible synthetic format fixtures. macOS sips supplies independent encoders.
const fs = require("node:fs"),
  path = require("node:path"),
  zlib = require("node:zlib");
const { execFileSync } = require("node:child_process");
const { crc32 } = require("../src/core.js");
const UTIF = require("utif");
const dir = path.join(__dirname, "fixtures/formats");
fs.mkdirSync(dir, { recursive: true });
const w = 96,
  h = 64,
  rgba = Buffer.alloc(w * h * 4);
const colors = [
  [230, 40, 40, 255],
  [40, 200, 60, 255],
  [40, 80, 220, 255],
  [230, 200, 40, 255],
];
for (let y = 0; y < h; y++)
  for (let x = 0; x < w; x++)
    rgba.set(colors[(y >= h / 2) * 2 + (x >= w / 2)], (y * w + x) * 4);
function chunk(type, data) {
  const header = Buffer.alloc(8),
    end = Buffer.alloc(4);
  header.writeUInt32BE(data.length);
  header.write(type, 4);
  end.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), data])));
  return Buffer.concat([header, data, end]);
}
const header = Buffer.alloc(13);
header.writeUInt32BE(w);
header.writeUInt32BE(h, 4);
header[8] = 8;
header[9] = 6;
const scan = Buffer.alloc((w * 4 + 1) * h);
for (let y = 0; y < h; y++)
  rgba.copy(scan, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", header),
  chunk("IDAT", zlib.deflateSync(scan)),
  chunk("IEND", Buffer.alloc(0)),
]);
fs.writeFileSync(path.join(dir, "colors.png"), png);
for (const [format, ext] of [
  ["heic", "heic"],
  ["avif", "avif"],
  ["jpeg", "jpg"],
  ["gif", "gif"],
  ["bmp", "bmp"],
  ["tiff", "tiff"],
])
  execFileSync(
    "sips",
    [
      "-s",
      "format",
      format,
      path.join(dir, "colors.png"),
      "--out",
      path.join(dir, `colors.${ext}`),
    ],
    { stdio: "pipe" },
  );
fs.copyFileSync(path.join(dir, "colors.heic"), path.join(dir, "colors.HEIF"));
fs.copyFileSync(path.join(dir, "colors.jpg"), path.join(dir, "colors.jfif"));
fs.writeFileSync(
  path.join(dir, "orientation-6.tif"),
  Buffer.from(UTIF.encodeImage(rgba, w, h, { t274: [6], t338: [2] })),
);
const alpha = Buffer.from(rgba);
for (let y = 0; y < h; y++)
  for (let x = 0; x < w / 2; x++) alpha[(y * w + x) * 4 + 3] = 0;
fs.writeFileSync(
  path.join(dir, "transparent.tif"),
  Buffer.from(UTIF.encodeImage(alpha, w, h, { t338: [2] })),
);
const pageTags = {
  t256: [w],
  t257: [h],
  t258: [8, 8, 8, 8],
  t259: [1],
  t262: [2],
  t273: [1000],
  t277: [4],
  t278: [h],
  t279: [rgba.length],
  t338: [2],
};
const directories = Buffer.from(
  UTIF.encode([pageTags, { ...pageTags, t273: [1000 + rgba.length] }]),
);
if (directories.length > 1000)
  throw new Error("Fixture metadata exceeds pixel offset");
fs.writeFileSync(
  path.join(dir, "multipage.tif"),
  Buffer.concat([
    directories,
    Buffer.alloc(1000 - directories.length),
    rgba,
    alpha,
  ]),
);
const icoHeader = Buffer.alloc(22);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);
icoHeader[6] = w;
icoHeader[7] = h;
icoHeader.writeUInt16LE(1, 10);
icoHeader.writeUInt16LE(32, 12);
icoHeader.writeUInt32LE(png.length, 14);
icoHeader.writeUInt32LE(22, 18);
fs.writeFileSync(path.join(dir, "colors.ico"), Buffer.concat([icoHeader, png]));
const actl = Buffer.alloc(8);
actl.writeUInt32BE(1);
const fctl = Buffer.alloc(26);
fctl.writeUInt32BE(w, 4);
fctl.writeUInt32BE(h, 8);
fctl.writeUInt16BE(1, 20);
fctl.writeUInt16BE(10, 22);
fs.writeFileSync(
  path.join(dir, "colors.apng"),
  Buffer.concat([
    png.subarray(0, 33),
    chunk("acTL", actl),
    chunk("fcTL", fctl),
    png.subarray(33),
  ]),
);
fs.writeFileSync(
  path.join(dir, "viewbox.svg"),
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 64"><defs><linearGradient id="g"><stop stop-color="#e62828"/><stop offset="1" stop-color="#28c83c"/></linearGradient></defs><rect width="96" height="64" fill="url(#g)"/></svg>',
);
fs.writeFileSync(
  path.join(dir, "external.svg"),
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="64"><image href="https://example.com/never-request.png" width="96" height="64"/></svg>',
);
fs.writeFileSync(
  path.join(dir, "script.svg"),
  '<svg xmlns="http://www.w3.org/2000/svg"><script>throw new Error("must not run")</script></svg>',
);
fs.writeFileSync(
  path.join(dir, "broken.heic"),
  Buffer.from("000000186674797068656963000000006d69663168656963", "hex"),
);
fs.writeFileSync(
  path.join(dir, "oversize.tif"),
  Buffer.from(
    UTIF.encode([
      {
        t256: [40000],
        t257: [40000],
        t258: [8, 8, 8],
        t259: [1],
        t262: [2],
        t273: [1000],
        t277: [3],
        t278: [40000],
        t279: [1],
      },
    ]),
  ),
);
console.log(
  "Created synthetic HEIC/HEIF, AVIF, TIFF, JPG/JFIF, GIF, BMP, ICO, APNG and SVG fixtures.",
);
