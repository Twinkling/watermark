// Synthetic, non-sensitive fixtures. No user's photos are used in tests.
const fs = require("node:fs"),
  path = require("node:path"),
  zlib = require("node:zlib");
const { crc32 } = require("../src/core.js");
function chunk(type, data) {
  const head = Buffer.alloc(8),
    end = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  head.write(type, 4);
  end.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), data])));
  return Buffer.concat([head, data, end]);
}
function png(width, height, transparent = false) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const pixels = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const n = y * (width * 4 + 1) + 1 + x * 4;
      pixels[n] = 240;
      pixels[n + 1] = 245;
      pixels[n + 2] = 233;
      pixels[n + 3] = transparent && x < width / 2 ? 0 : 255;
    }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
const dir = path.join(__dirname, "fixtures");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "横版测试.png"), png(1200, 800));
fs.writeFileSync(path.join(dir, "透明测试.png"), png(640, 960, true));
fs.writeFileSync(path.join(dir, "损坏图片.png"), "this is not a PNG");
fs.writeFileSync(path.join(dir, "不支持.txt"), "non-image test fixture");
console.log("Synthetic test fixtures created.");
