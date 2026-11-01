const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm");
const Formats = require("../src/formats.js");
const dir = path.join(__dirname, "fixtures/formats");
test("根据真实文件头识别常见图片，忽略缺失或错误的 MIME 与扩展名", () => {
  for (const [name, expected] of [
    ["colors.heic", "heic"],
    ["colors.HEIF", "heic"],
    ["colors.avif", "avif"],
    ["colors.webp", "webp"],
    ["colors.tiff", "tiff"],
    ["colors.png", "png"],
    ["colors.jpg", "jpeg"],
    ["colors.gif", "gif"],
    ["colors.bmp", "bmp"],
    ["colors.ico", "ico"],
    ["colors.apng", "png"],
    ["viewbox.svg", "svg"],
  ])
    assert.equal(
      Formats.detect(
        fs.readFileSync(path.join(dir, name)),
        "unknown.bin",
        "application/octet-stream",
      ),
      expected,
      name,
    );
});
test("AVIF 的 compatible brand 优先于通用 HEIF brand", () => {
  const b = Buffer.from(
    "00000018667479706d69663100000000617669666d696631",
    "hex",
  );
  assert.equal(Formats.detect(b, "wrong.heic"), "avif");
});
test("空文件、文档和 RAW 不会错误地作为 TIFF 图片接受", () => {
  assert.equal(Formats.detect(new Uint8Array(), "unknown.bin"), null);
  assert.equal(Formats.detect(Buffer.from("%PDF-1.7"), "example.pdf"), null);
  assert.equal(
    Formats.detect(Buffer.from("49492a00", "hex"), "camera.dng"),
    null,
  );
});
test("尺寸与剩余像素预算在解码前受到约束", () => {
  assert.throws(() => Formats.checkDimensions(40000, 100));
  assert.throws(() => Formats.checkDimensions(10000, 10000));
  assert.throws(() => Formats.checkDimensions(100, 100, 9999));
  Formats.checkDimensions(100, 100, 10000);
});
test("TIFF 的八种 EXIF 变换均落在方向纠正后的边界内", () => {
  for (let orientation = 1; orientation <= 8; orientation++) {
    const w = 96,
      h = 64,
      [a, b, c, d, e, f] = Formats.orientationTransform(orientation, w, h);
    const points = [
      [0, 0],
      [w, 0],
      [0, h],
      [w, h],
    ].map(([x, y]) => [a * x + c * y + e, b * x + d * y + f]);
    assert.equal(Math.min(...points.map((p) => p[0])), 0);
    assert.equal(Math.min(...points.map((p) => p[1])), 0);
    assert.equal(
      Math.max(...points.map((p) => p[0])),
      orientation >= 5 ? h : w,
    );
    assert.equal(
      Math.max(...points.map((p) => p[1])),
      orientation >= 5 ? w : h,
    );
  }
});
const bundled = {};
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, "../vendor/codecs.js"), "utf8"),
  bundled,
);
function decodeWorker(name, format, maxPixels = 32e6) {
  return new Promise((resolve, reject) => {
    const file = fs.readFileSync(path.join(dir, name));
    const sandbox = {
      console: { log() {}, error() {} },
      setTimeout,
      clearTimeout,
      TextDecoder,
      TextEncoder,
      URL,
      WorkerGlobalScope: function () {},
      location: { href: "blob:http://localhost/test" },
      ImageData: class {
        constructor(w, h) {
          this.width = w;
          this.height = h;
          this.data = new Uint8ClampedArray(w * h * 4);
        }
      },
      postMessage: resolve,
    };
    sandbox.self = sandbox;
    try {
      vm.createContext(sandbox);
      vm.runInContext(bundled.WatermarkCodecSource, sandbox, {
        timeout: 10000,
      });
      sandbox
        .onmessage({
          data: {
            buffer: file.buffer.slice(
              file.byteOffset,
              file.byteOffset + file.byteLength,
            ),
            format,
            maxPixels,
          },
        })
        .catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}
test("实际 HEIC 解码保持尺寸和四个象限颜色", async () => {
  const out = await decodeWorker("colors.heic", "heic");
  assert.equal(out.error, undefined);
  assert.deepEqual([out.width, out.height], [96, 64]);
  const pixel = (x, y) =>
    Array.from(
      new Uint8Array(out.rgba).slice(
        (y * out.width + x) * 4,
        (y * out.width + x) * 4 + 4,
      ),
    );
  assert.ok(pixel(10, 10)[0] > 200);
  assert.ok(pixel(70, 10)[1] > 150);
  assert.ok(pixel(10, 50)[2] > 180);
  assert.equal(pixel(10, 10)[3], 255);
});
test("TIFF 解码保留透明度与方向标签", async () => {
  const alpha = await decodeWorker("transparent.tif", "tiff");
  assert.equal(alpha.error, undefined);
  const pixels = new Uint8Array(alpha.rgba);
  assert.equal(pixels[3], 0);
  assert.equal(pixels[70 * 4 + 3], 255);
  const rotated = await decodeWorker("orientation-6.tif", "tiff");
  assert.equal(rotated.orientation, 6);
  assert.deepEqual([rotated.width, rotated.height], [96, 64]);
});
test("HEIC 损坏、TIFF 巨大尺寸和像素预算错误可恢复", async () => {
  assert.match((await decodeWorker("broken.heic", "heic")).error, /损坏|编码/);
  assert.match((await decodeWorker("oversize.tif", "tiff")).error, /超限/);
  assert.match((await decodeWorker("colors.heic", "heic", 10)).error, /上限/);
});
test("多页 TIFF 仅解码第一页并报告页数", async () => {
  const out = await decodeWorker("multipage.tif", "tiff");
  assert.equal(out.error, undefined);
  assert.equal(out.pageCount, 2);
  assert.equal(new Uint8Array(out.rgba)[3], 255);
});
