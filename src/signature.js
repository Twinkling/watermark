/* Local, vector-based signature drawing. GPL-3.0-only. */
(function (root) {
  "use strict";
  const WIDTH = 900,
    HEIGHT = 400;
  function normalize(raw = {}) {
    let budget = 20000;
    const strokes = (Array.isArray(raw.strokes) ? raw.strokes : [])
      .slice(0, 256)
      .map((stroke) => {
        const points = [];
        for (const p of Array.isArray(stroke) ? stroke : []) {
          if (!budget) break;
          if (
            !Array.isArray(p) ||
            !Number.isFinite(p[0]) ||
            !Number.isFinite(p[1])
          )
            continue;
          points.push([
            Math.max(0, Math.min(WIDTH, p[0])),
            Math.max(0, Math.min(HEIGHT, p[1])),
          ]);
          budget--;
        }
        return points;
      })
      .filter((s) => s.length);
    return {
      version: 1,
      color: /^#[a-f0-9]{6}$/i.test(raw.color) ? raw.color : "#25242c",
      width: Number.isFinite(Number(raw.width))
        ? Math.max(1, Math.min(14, Number(raw.width)))
        : 5,
      strokes,
    };
  }
  function bounds(raw) {
    const s = normalize(raw);
    if (!s.strokes.length) return null;
    let x = WIDTH,
      y = HEIGHT,
      right = 0,
      bottom = 0;
    for (const stroke of s.strokes)
      for (const p of stroke) {
        x = Math.min(x, p[0]);
        y = Math.min(y, p[1]);
        right = Math.max(right, p[0]);
        bottom = Math.max(bottom, p[1]);
      }
    const pad = s.width / 2 + 10;
    x = Math.max(0, Math.floor(x - pad));
    y = Math.max(0, Math.floor(y - pad));
    return {
      x,
      y,
      width: Math.max(1, Math.min(WIDTH, Math.ceil(right + pad)) - x),
      height: Math.max(1, Math.min(HEIGHT, Math.ceil(bottom + pad)) - y),
    };
  }
  function draw(ctx, raw) {
    const s = normalize(raw);
    ctx.save();
    ctx.strokeStyle = ctx.fillStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.lineCap = ctx.lineJoin = "round";
    for (const pts of s.strokes) {
      if (pts.length === 1) {
        ctx.beginPath();
        ctx.arc(pts[0][0], pts[0][1], s.width / 2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(...pts[0]);
      for (let i = 1; i < pts.length - 1; i++)
        ctx.quadraticCurveTo(
          ...pts[i],
          (pts[i][0] + pts[i + 1][0]) / 2,
          (pts[i][1] + pts[i + 1][1]) / 2,
        );
      ctx.lineTo(...pts[pts.length - 1]);
      ctx.stroke();
    }
    ctx.restore();
  }
  function toCanvas(raw, scale = 3) {
    const s = normalize(raw),
      b = bounds(s);
    if (!b) throw Error("请先写下签名");
    const c = document.createElement("canvas");
    c.width = Math.ceil(b.width * scale);
    c.height = Math.ceil(b.height * scale);
    const ctx = c.getContext("2d");
    ctx.scale(scale, scale);
    ctx.translate(-b.x, -b.y);
    draw(ctx, s);
    return c;
  }
  const api = { WIDTH, HEIGHT, normalize, bounds, draw, toCanvas };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WatermarkSignature = api;
})(globalThis);
