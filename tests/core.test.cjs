const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const Core = require("../src/core.js");

test("无效参数不会产生不可见或无限循环的水印", () => {
  const config = Core.normalize({
    opacity: 0,
    size: -50,
    spacing: 0,
    angle: Infinity,
    color: "red",
    format: "gif",
    position: 99,
  });
  assert.equal(config.opacity, 5);
  assert.equal(config.size, 1);
  assert.equal(config.spacing, 1);
  assert.equal(config.angle, -30);
  assert.equal(config.color, "#2d6553");
  assert.equal(config.format, "png");
  assert.equal(config.position, 8);
});
test("中文导出名安全且同名图片不会在 ZIP 内相互覆盖", () => {
  const used = new Set();
  assert.equal(Core.outputName("身份证.png", "jpeg", used), "身份证_水印.jpg");
  assert.equal(
    Core.outputName("身份证.JPG", "jpeg", used),
    "身份证_水印_2.jpg",
  );
  assert.equal(Core.outputName("../../资料.png", "png"), "_.._资料_水印.png");
});
test("旋转边界在 0、45、90 度时保持正确", () => {
  assert.deepEqual(Core.rotatedBounds(800, 600, 0), {
    width: 800,
    height: 600,
  });
  const rotated = Core.rotatedBounds(800, 600, Math.PI / 2);
  assert.ok(Math.abs(rotated.width - 600) < 1e-9);
  assert.ok(Math.abs(rotated.height - 800) < 1e-9);
  const diagonal = Core.rotatedBounds(100, 100, Math.PI / 4);
  assert.ok(Math.abs(diagonal.width - Math.SQRT2 * 100) < 1e-9);
});
test("长多行水印在单点模式下完整落入旋转后可用区域", () => {
  const ctx = {
    font: "",
    measureText(text) {
      return { width: text.length * parseFloat(this.font.split(" ")[1]) };
    },
  };
  for (const angle of [-90, -45, 0, 45, 90]) {
    const result = Core.layout(ctx, 300, 120, {
      mode: "single",
      size: 8,
      text: "很长的中文水印".repeat(10) + "\n第二行",
      angle,
    });
    const bounds = Core.rotatedBounds(
      result.textWidth,
      result.textHeight,
      result.radians,
    );
    assert.ok(bounds.width <= 270.0001);
    assert.ok(bounds.height <= 108.0001);
  }
});
test("CRC32 匹配标准测试向量", () =>
  assert.equal(Core.crc32(new TextEncoder().encode("123456789")), 0xcbf43926));
test("生成的 ZIP 可被独立 Python zipfile 解压，中文文件名、内容和校验和正确", async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "liuyin-zip-test-"));
  const target = path.join(temp, "archive.zip");
  try {
    const data = [
      { name: "证件_水印.png", data: new Uint8Array([0, 1, 2, 255]) },
      {
        name: "作品_水印_2.jpg",
        data: new TextEncoder().encode("watermark-test"),
      },
    ];
    fs.writeFileSync(target, Buffer.from(await Core.zip(data).arrayBuffer()));
    const result = JSON.parse(
      execFileSync(
        "python3",
        [
          "-c",
          'import zipfile,json,sys; z=zipfile.ZipFile(sys.argv[1]); print(json.dumps({"names":z.namelist(),"crc_error":z.testzip(),"contents":[list(z.read(n)) for n in z.namelist()]}))',
          target,
        ],
        { encoding: "utf8" },
      ),
    );
    assert.deepEqual(
      result.names,
      data.map((file) => file.name),
    );
    assert.equal(result.crc_error, null);
    assert.deepEqual(
      result.contents,
      data.map((file) => Array.from(file.data)),
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
test("离线发行文件没有外部脚本、样式或远程图片引用", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "../dist/留印.html"),
    "utf8",
  );
  assert.ok(!/<script[^>]+src=/.test(html));
  assert.ok(!/<link[^>]+rel="stylesheet"/.test(html));
  assert.ok(html.includes("connect-src 'none'"));
  assert.ok(html.indexOf("window.WatermarkCore") > html.indexOf("<noscript>"));
  assert.ok(!/(?:src|href)="https?:\/\//.test(html));
});
