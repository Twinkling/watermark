/* Run through tests/studio-browser.html in a real browser. Synthetic pixels only. */
(() => {
  const E = WatermarkStudio,
    results = [];
  const canvas = (w, h, color) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    if (color) {
      const x = c.getContext("2d");
      x.fillStyle = color;
      x.fillRect(0, 0, w, h);
    }
    return c;
  };
  const pixel = (c, x, y) => [
    ...c.getContext("2d").getImageData(x, y, 1, 1).data,
  ];
  const eq = (a, b) => {
    if (JSON.stringify(a) !== JSON.stringify(b))
      throw Error(`${JSON.stringify(a)} != ${JSON.stringify(b)}`);
  };
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (e) {
      results.push({ name, pass: false, error: e.message });
    }
  };
  test("手写签名裁掉留白并保留透明背景和笔迹颜色", () => {
    const c = WatermarkSignature.toCanvas({
      color: "#25242c",
      width: 6,
      strokes: [
        [
          [100, 80],
          [400, 80],
          [400, 200],
        ],
      ],
    });
    eq([c.width, c.height], [978, 438]);
    eq(pixel(c, 0, 0), [0, 0, 0, 0]);
    eq(pixel(c, 200, 39), [37, 36, 44, 255]);
  });
  test("单点笔迹可以导出，空白签名明确拒绝", () => {
    const c = WatermarkSignature.toCanvas({
      color: "#000000",
      width: 6,
      strokes: [[[150, 150]]],
    });
    eq(pixel(c, 39, 39), [0, 0, 0, 255]);
    let rejected = false;
    try {
      WatermarkSignature.toCanvas({ strokes: [] });
    } catch {
      rejected = true;
    }
    eq(rejected, true);
  });
  const source = canvas(100, 80, "#0000ff"),
    q = source.getContext("2d");
  q.fillStyle = "#ff0000";
  q.fillRect(0, 0, 50, 40);
  q.fillStyle = "#00ff00";
  q.fillRect(50, 0, 50, 40);
  q.fillStyle = "#ffff00";
  q.fillRect(50, 40, 50, 40);
  const doc = () => {
    const d = E.defaults();
    d.layers = [];
    return d;
  };
  const render = (d, image = source, assets = new Map(), options = {}) => {
    const c = canvas(1, 1);
    E.render(c, image, d, assets, options);
    return c;
  };
  test("裁剪后顺时针旋转，输出颜色与方向正确", () => {
    const d = doc();
    d.edit.crop = { x: 0, y: 0, w: 0.5, h: 1 };
    d.edit.rotate = 1;
    const c = render(d);
    eq([c.width, c.height], [80, 50]);
    eq(pixel(c, 10, 25), [0, 0, 255, 255]);
    eq(pixel(c, 70, 25), [255, 0, 0, 255]);
  });
  test("水平与垂直翻转不会丢失象限", () => {
    const d = doc();
    d.edit.flipX = true;
    d.edit.flipY = true;
    eq(pixel(render(d), 10, 10), [255, 255, 0, 255]);
  });
  test("适应画布保留透明留白，JPG 补白", () => {
    const d = doc();
    Object.assign(d.edit, { resizeMode: "contain", width: 200, height: 200 });
    eq(pixel(render(d), 100, 5), [0, 0, 0, 0]);
    eq(
      pixel(render(d, source, new Map(), { format: "jpeg" }), 100, 5),
      [255, 255, 255, 255],
    );
  });
  test("填满画布不产生透明边缘", () => {
    const d = doc();
    Object.assign(d.edit, { resizeMode: "cover", width: 60, height: 180 });
    const c = render(d);
    eq([c.width, c.height], [60, 180]);
    eq(pixel(c, 2, 2)[3], 255);
    eq(pixel(c, 58, 178)[3], 255);
  });
  const red = canvas(20, 20, "#ff0000"),
    green = canvas(20, 20, "#00ff00");
  const assets = new Map([
    ["red", { image: red, width: 20, height: 20 }],
    ["green", { image: green, width: 20, height: 20 }],
  ]);
  const logo = (id, asset) =>
    Object.assign(E.layer("logo", id), {
      asset,
      size: 40,
      opacity: 100,
      x: 0.5,
      y: 0.5,
    });
  test("多层 Logo 按顺序合成，隐藏后露出底层", () => {
    const d = doc();
    d.layers = [logo("a", "red"), logo("b", "green")];
    eq(pixel(render(d, source, assets), 50, 40), [0, 255, 0, 255]);
    d.layers[1].visible = false;
    eq(pixel(render(d, source, assets), 50, 40), [255, 0, 0, 255]);
  });
  test("Logo 去白底和着色保留透明度", () => {
    const icon = canvas(20, 20, "#ffffff");
    const x = icon.getContext("2d");
    x.fillStyle = "#ff0000";
    x.fillRect(10, 0, 10, 20);
    const a = new Map([["icon", { image: icon, width: 20, height: 20 }]]),
      d = doc();
    d.layers = [
      Object.assign(logo("a", "icon"), {
        removeWhite: 40,
        tint: true,
        color: "#00ffff",
      }),
    ];
    const c = render(d, source, a, { watermarkOnly: true });
    eq(pixel(c, 35, 40)[3], 0);
    eq(pixel(c, 65, 40), [0, 255, 255, 255]);
  });
  test("单独导出水印没有源图、图案和边框填色", () => {
    const d = doc();
    d.layers = [logo("a", "red")];
    Object.assign(d.edit, { frame: "instant", protect: "grid" });
    const c = render(d, source, assets, { watermarkOnly: true });
    eq(pixel(c, 0, 0)[3], 0);
    eq(pixel(c, 10, 10)[3], 0);
    const dim = E.dimensions(100, 80, d);
    eq([c.width, c.height], [dim.width, dim.height]);
  });
  test("圆角裁剪也约束纹理和水印，角落保留边框色", () => {
    const d = doc();
    Object.assign(d.edit, {
      frame: "rounded",
      frameSize: 10,
      frameColor: "#ffffff",
      protect: "grid",
      protectOpacity: 70,
    });
    d.layers = [Object.assign(logo("a", "red"), { x: 0, y: 0, size: 80 })];
    const c = render(d, source, assets),
      m = E.dimensions(100, 80, d).margin;
    eq(pixel(c, m, m), [255, 255, 255, 255]);
  });
  test("黑白滤镜不改变源透明度，零强度恢复原色", () => {
    const d = doc();
    d.edit.filter = "mono";
    const p = pixel(render(d), 10, 10);
    eq(p[0], p[1]);
    eq(p[1], p[2]);
    eq(p[3], 255);
    d.edit.strength = 0;
    eq(pixel(render(d), 10, 10), [255, 0, 0, 255]);
    const clear = canvas(10, 10);
    d.edit.brightness = 50;
    eq(pixel(render(d, clear), 5, 5)[3], 0);
  });
  test("校直自动放大，不露出透明四角", () => {
    const d = doc();
    d.edit.straighten = 23;
    const c = render(d);
    for (const [x, y] of [
      [1, 1],
      [98, 1],
      [1, 78],
      [98, 78],
    ])
      eq(pixel(c, x, y)[3], 255);
  });
  test("预览缩放保留导出布局比例", () => {
    const d = doc();
    d.layers = [logo("a", "red")];
    const big = canvas(1, 1),
      small = canvas(1, 1);
    const a = E.render(big, source, d, assets),
      b = E.render(small, source, d, assets, { scale: 0.5 });
    eq(
      [b.boxes[0].x, b.boxes[0].y, b.boxes[0].w],
      [a.boxes[0].x / 2, a.boxes[0].y / 2, a.boxes[0].w / 2],
    );
    eq(pixel(big, 50, 40), pixel(small, 25, 20));
  });
  test("所有图案、滤镜、边框组合均能实际绘制", () => {
    for (const protect of [
      "lines",
      "grid",
      "hatch",
      "waves",
      "dots",
      "crosses",
      "zigzag",
      "honeycomb",
      "rings",
      "rays",
    ])
      for (const frame of [
        "border",
        "gallery",
        "instant",
        "rounded",
        "film",
        "shadow",
      ])
        for (const filter of [
          "none",
          "mono",
          "sepia",
          "warm",
          "cool",
          "vivid",
          "fade",
          "dramatic",
        ]) {
          const d = doc();
          Object.assign(d.edit, { protect, frame, filter });
          const c = render(d);
          if (!c.width || !c.height) throw Error("空输出");
        }
  });
  document.querySelector("#results").textContent = JSON.stringify(
    {
      passed: results.filter((r) => r.pass).length,
      total: results.length,
      results,
    },
    null,
    2,
  );
  document.title = `${results.every((r) => r.pass) ? "PASS" : "FAIL"} · Canvas 像素回归测试`;
})();
