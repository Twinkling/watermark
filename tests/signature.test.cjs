const test = require("node:test");
const assert = require("node:assert/strict");
const Ink = require("../src/signature.js");
test("空白签名没有边界，不能作为有效笔迹", () => {
  assert.equal(Ink.bounds({}), null);
  assert.deepEqual(
    Ink.normalize({ strokes: [[], null, [[NaN, 2]]] }).strokes,
    [],
  );
});
test("签名边界按笔宽保留透明安全边距并限制在画板内", () => {
  assert.deepEqual(
    Ink.bounds({
      width: 6,
      strokes: [
        [
          [100, 80],
          [400, 200],
        ],
      ],
    }),
    { x: 87, y: 67, width: 326, height: 146 },
  );
  assert.deepEqual(
    Ink.bounds({
      width: 14,
      strokes: [
        [
          [-20, -9],
          [990, 490],
        ],
      ],
    }),
    { x: 0, y: 0, width: 900, height: 400 },
  );
  const dot = Ink.bounds({ strokes: [[[150, 150]]] });
  assert.ok(dot.width > 0 && dot.height > 0);
});
test("导入签名过滤非法坐标、颜色与超量笔迹", () => {
  const s = Ink.normalize({
    width: 999,
    color: "url(https://example.com)",
    strokes: [
      [
        [Infinity, 1],
        ["1", 2],
        [1, 2],
        [999, -20],
      ],
    ],
  });
  assert.equal(s.width, 14);
  assert.equal(s.color, "#25242c");
  assert.deepEqual(s.strokes, [
    [
      [1, 2],
      [900, 0],
    ],
  ]);
  const many = Ink.normalize({
    strokes: Array.from({ length: 300 }, () =>
      Array.from({ length: 100 }, () => [2, 3]),
    ),
  });
  assert.equal(
    many.strokes.reduce((n, s) => n + s.length, 0),
    20000,
  );
  assert.ok(many.strokes.length <= 256);
});
