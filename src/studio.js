/* 留印 Studio: serializable edits and shared preview/export renderer. GPL-3.0-only. */
(function (root) {
  "use strict";
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const n = (v, min, max, fallback) =>
    Number.isFinite(Number(v))
      ? Math.min(max, Math.max(min, Number(v)))
      : fallback;
  const color = (v, f = "#7160cd") => (/^#[\da-f]{6}$/i.test(v) ? v : f);
  const fonts = {
    sans: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
    serif: '"Songti SC", "Noto Serif CJK SC", Georgia, serif',
    mono: '"SFMono-Regular", Consolas, monospace',
    hand: '"Kaiti SC", KaiTi, "Brush Script MT", cursive',
    art_mashanzheng: '"art_mashanzheng", serif',
    art_longcang: '"art_longcang", cursive',
    art_zcoolkuaile: '"art_zcoolkuaile", sans-serif',
    art_dancingscript: '"art_dancingscript", sans-serif',
    art_greatvibes: '"art_greatvibes", sans-serif',
    art_caveat: '"art_caveat", sans-serif',
    art_zhimangxing: '"art_zhimangxing", cursive',
    art_liujianmaocao: '"art_liujianmaocao", cursive',
    art_lxgwwenkaitc: '"art_lxgwwenkaitc", serif',
    art_allura: '"art_allura", sans-serif',
    art_sacramento: '"art_sacramento", sans-serif',
    art_kalam: '"art_kalam", sans-serif',
  };
  function layer(type = "text", id = "mark-1") {
    return {
      id,
      name: "",
      type,
      text: type === "signature" ? "我的签名" : "仅供办理业务使用 · 他用无效",
      font: type === "signature" ? "hand" : "sans",
      color: "#7160cd",
      opacity: type === "text" ? 24 : 80,
      size: type === "logo" ? 18 : 3.2,
      x: 0.5,
      y: 0.5,
      angle: type === "text" ? -30 : 0,
      mode: type === "text" ? "tile" : "single",
      spacing: 2.5,
      bold: false,
      italic: false,
      underline: false,
      lineHeight: 1.4,
      stroke: 0,
      strokeColor: "#ffffff",
      shadow: 0,
      background: false,
      backgroundColor: "#ffffff",
      asset: "",
      tint: false,
      removeWhite: 0,
      visible: true,
    };
  }
  function defaults() {
    return {
      layers: [layer()],
      edit: {
        crop: { x: 0, y: 0, w: 1, h: 1 },
        cropAspect: 0,
        rotate: 0,
        flipX: false,
        flipY: false,
        straighten: 0,
        brightness: 0,
        contrast: 0,
        saturation: 0,
        warmth: 0,
        tint: 0,
        filter: "none",
        strength: 100,
        protect: "none",
        protectColor: "#7160cd",
        protectOpacity: 12,
        protectSpacing: 6,
        frame: "none",
        frameSize: 4,
        frameColor: "#ffffff",
        caption: "留住生活的每一点美好",
        resize: 0,
        resizeMode: "long",
        width: 1200,
        height: 800,
      },
    };
  }
  function normalize(doc = {}) {
    const base = defaults(),
      e = { ...base.edit, ...doc.edit },
      c = { ...base.edit.crop, ...e.crop };
    c.x = n(c.x, 0, 0.99, 0);
    c.y = n(c.y, 0, 0.99, 0);
    c.w = n(c.w, 0.01, 1 - c.x, 1 - c.x);
    c.h = n(c.h, 0.01, 1 - c.y, 1 - c.y);
    const edit = {
      ...base.edit,
      crop: c,
      cropAspect: n(e.cropAspect, 0, 100, 0),
      rotate: Math.round(n(e.rotate, 0, 3, 0)),
      flipX: !!e.flipX,
      flipY: !!e.flipY,
      straighten: n(e.straighten, -30, 30, 0),
      brightness: n(e.brightness, -100, 100, 0),
      contrast: n(e.contrast, -100, 100, 0),
      saturation: n(e.saturation, -100, 100, 0),
      warmth: n(e.warmth, -100, 100, 0),
      tint: n(e.tint, -100, 100, 0),
      filter: [
        "none",
        "mono",
        "sepia",
        "warm",
        "cool",
        "vivid",
        "fade",
        "dramatic",
      ].includes(e.filter)
        ? e.filter
        : "none",
      strength: n(e.strength, 0, 100, 100),
      protect: [
        "none",
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
      ].includes(e.protect)
        ? e.protect
        : "none",
      protectColor: color(e.protectColor),
      protectOpacity: n(e.protectOpacity, 1, 70, 12),
      protectSpacing: n(e.protectSpacing, 2, 20, 6),
      frame: [
        "none",
        "border",
        "gallery",
        "instant",
        "rounded",
        "film",
        "shadow",
      ].includes(e.frame)
        ? e.frame
        : "none",
      frameSize: n(e.frameSize, 1, 15, 4),
      frameColor: color(e.frameColor, "#ffffff"),
      caption: String(e.caption || "").slice(0, 80),
      resize: n(e.resize, 0, 16384, 0),
      resizeMode: ["long", "contain", "cover", "stretch"].includes(e.resizeMode)
        ? e.resizeMode
        : "long",
      width: n(e.width, 1, 16384, 1200),
      height: n(e.height, 1, 16384, 800),
    };
    const layers = (Array.isArray(doc.layers) ? doc.layers : base.layers)
      .slice(0, 12)
      .map((l, i) => {
        const d = layer();
        return {
          ...d,
          name: String(l.name || "").slice(0, 60),
          id: String(l.id || `mark-${i}`).slice(0, 80),
          type: ["text", "signature", "logo"].includes(l.type)
            ? l.type
            : "text",
          text: String(l.text ?? "").slice(0, 240),
          font:
            fonts[l.font] || /^font_[a-zA-Z0-9_-]{1,60}$/.test(l.font)
              ? l.font
              : "sans",
          color: color(l.color),
          opacity: n(l.opacity, 1, 100, 80),
          size: n(l.size, 0.5, 80, 4),
          x: n(l.x, 0, 1, 0.5),
          y: n(l.y, 0, 1, 0.5),
          angle: n(l.angle, -180, 180, 0),
          mode: l.mode === "tile" ? "tile" : "single",
          spacing: n(l.spacing, 0.5, 6, 2.5),
          bold: !!l.bold,
          italic: !!l.italic,
          underline: !!l.underline,
          lineHeight: n(l.lineHeight, 1, 2.5, 1.4),
          stroke: n(l.stroke, 0, 12, 0),
          strokeColor: color(l.strokeColor, "#ffffff"),
          shadow: n(l.shadow, 0, 15, 0),
          background: !!l.background,
          backgroundColor: color(l.backgroundColor, "#ffffff"),
          asset: String(l.asset || "").slice(0, 80),
          tint: !!l.tint,
          removeWhite: n(l.removeWhite, 0, 80, 0),
          visible: l.visible !== false,
        };
      });
    return { layers, edit };
  }
  function cropFor(w, h, e) {
    if (!e.cropAspect) return { ...e.crop };
    const ratio = e.cropAspect,
      ar = w / h;
    return ar > ratio
      ? { x: (1 - ratio / ar) / 2, y: 0, w: ratio / ar, h: 1 }
      : { x: 0, y: (1 - ar / ratio) / 2, w: 1, h: ar / ratio };
  }
  function dimensions(w, h, doc) {
    const e = normalize(doc).edit;
    const crop = cropFor(w, h, e);
    let cw = Math.max(1, Math.round(w * crop.w)),
      ch = Math.max(1, Math.round(h * crop.h));
    if (e.rotate % 2) [cw, ch] = [ch, cw];
    let ow = cw,
      oh = ch;
    if (e.resizeMode === "long" && e.resize > 0) {
      const r = Math.min(1, e.resize / Math.max(cw, ch));
      ow = Math.round(cw * r);
      oh = Math.round(ch * r);
    } else if (e.resizeMode !== "long") {
      ow = Math.round(e.width);
      oh = Math.round(e.height);
    }
    const margin =
        e.frame === "none"
          ? 0
          : Math.round((Math.min(ow, oh) * e.frameSize) / 100),
      bottom = e.frame === "instant" ? margin * 3 : margin;
    return {
      cropWidth: cw,
      cropHeight: ch,
      photoWidth: Math.max(1, ow),
      photoHeight: Math.max(1, oh),
      margin,
      bottom,
      width: Math.max(1, ow + margin * 2),
      height: Math.max(1, oh + margin + bottom),
    };
  }
  function fontString(l, size) {
    return `${l.italic ? "italic " : ""}${l.bold ? "700" : "500"} ${size}px ${fonts[l.font] || `"${l.font}"`}`;
  }
  function geometry(ctx, w, h, l, assets) {
    let size = Math.max(1, (Math.min(w, h) * l.size) / 100),
      bw,
      bh;
    const lines = l.text.split(/\r?\n/);
    ctx.font = fontString(l, size);
    if (l.type === "logo") {
      const a = assets.get(l.asset);
      bw = (w * l.size) / 100;
      bh = a ? (bw * a.height) / a.width : bw;
    } else {
      bw = Math.max(size, ...lines.map((line) => ctx.measureText(line).width));
      bh = lines.length * size * l.lineHeight;
    }
    const angle = (l.angle * Math.PI) / 180,
      rx = Math.abs(bw * Math.cos(angle)) + Math.abs(bh * Math.sin(angle)),
      ry = Math.abs(bw * Math.sin(angle)) + Math.abs(bh * Math.cos(angle)),
      fit =
        l.mode === "single"
          ? Math.min(
              1,
              (w * 0.96) / Math.max(1, rx),
              (h * 0.96) / Math.max(1, ry),
            )
          : 1;
    bw *= fit;
    bh *= fit;
    size *= fit;
    const bx = rx * fit,
      by = ry * fit;
    return {
      x: n(l.x * w, bx / 2, w - bx / 2, w / 2),
      y: n(l.y * h, by / 2, h - by / 2, h / 2),
      w: bw,
      h: bh,
      bx,
      by,
      size,
      angle,
      lines,
    };
  }
  function makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }
  function logoCanvas(asset, l) {
    if (!l.tint && !l.removeWhite) return asset.image;
    const key = `${l.tint}:${l.color}:${l.removeWhite}`;
    if (asset.cacheKey === key) return asset.cache;
    if (asset.cache) asset.cache.width = asset.cache.height = 1;
    const c = makeCanvas(asset.width, asset.height),
      ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(asset.image, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height),
      p = data.data,
      r = parseInt(l.color.slice(1, 3), 16),
      g = parseInt(l.color.slice(3, 5), 16),
      b = parseInt(l.color.slice(5, 7), 16);
    for (let i = 0; i < p.length; i += 4) {
      if (l.removeWhite) {
        const d = 255 - Math.min(p[i], p[i + 1], p[i + 2]);
        p[i + 3] *= Math.min(1, d / Math.max(1, l.removeWhite));
      }
      if (l.tint) {
        p[i] = r;
        p[i + 1] = g;
        p[i + 2] = b;
      }
    }
    ctx.putImageData(data, 0, 0);
    asset.cacheKey = key;
    asset.cache = c;
    return c;
  }
  function drawLayer(ctx, w, h, l, assets) {
    if (
      !l.visible ||
      (l.type === "logo" ? !assets.has(l.asset) : !l.text.trim())
    )
      return null;
    const g = geometry(ctx, w, h, l, assets);
    ctx.save();
    ctx.globalAlpha = l.opacity / 100;
    ctx.fillStyle = l.color;
    ctx.font = fontString(l, g.size);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    const draw = (x, y) => {
      ctx.save();
      ctx.translate(x, y);
      if (l.background) {
        ctx.fillStyle = l.backgroundColor;
        ctx.fillRect(
          -g.w / 2 - g.size * 0.25,
          -g.h / 2,
          g.w + g.size * 0.5,
          g.h,
        );
        ctx.fillStyle = l.color;
      }
      if (l.shadow) {
        ctx.shadowColor = "rgba(0,0,0,.65)";
        ctx.shadowBlur = (g.size * l.shadow) / 12;
        ctx.shadowOffsetY = (g.size * l.shadow) / 30;
      }
      if (l.type === "logo")
        ctx.drawImage(
          logoCanvas(assets.get(l.asset), l),
          -g.w / 2,
          -g.h / 2,
          g.w,
          g.h,
        );
      else
        g.lines.forEach((line, i) => {
          const yy = (i - (g.lines.length - 1) / 2) * g.size * l.lineHeight;
          if (l.stroke) {
            ctx.strokeStyle = l.strokeColor;
            ctx.lineWidth = (g.size * l.stroke) / 50;
            ctx.strokeText(line, 0, yy);
          }
          ctx.fillText(line, 0, yy);
          if (l.underline) {
            ctx.fillRect(
              -ctx.measureText(line).width / 2,
              yy + g.size * 0.5,
              ctx.measureText(line).width,
              Math.max(1, g.size / 20),
            );
          }
        });
      ctx.restore();
    };
    if (l.mode === "single") {
      ctx.translate(g.x, g.y);
      ctx.rotate(g.angle);
      draw(0, 0);
    } else {
      ctx.translate(w / 2, h / 2);
      ctx.rotate(g.angle);
      const aw =
          Math.abs(w * Math.cos(g.angle)) + Math.abs(h * Math.sin(g.angle)),
        ah = Math.abs(w * Math.sin(g.angle)) + Math.abs(h * Math.cos(g.angle));
      let sx = g.w + g.size * l.spacing * 2,
        sy = g.h + g.size * l.spacing;
      const adjust = Math.max(
        1,
        Math.sqrt(((aw / sx + 4) * (ah / sy + 4)) / 5000),
      );
      sx *= adjust;
      sy *= adjust;
      const rows = Math.ceil(ah / sy / 2) + 1,
        cols = Math.ceil(aw / sx / 2) + 1;
      for (let r = -rows; r <= rows; r++)
        for (let c = -cols; c <= cols; c++)
          draw(c * sx + (r % 2 ? sx / 2 : 0), r * sy);
    }
    ctx.restore();
    return { ...g, id: l.id, tile: l.mode === "tile" };
  }
  function protect(ctx, w, h, e) {
    if (e.protect === "none") return;
    const s = Math.max(8, (Math.min(w, h) * e.protectSpacing) / 100);
    ctx.save();
    ctx.strokeStyle = ctx.fillStyle = e.protectColor;
    ctx.globalAlpha = e.protectOpacity / 100;
    ctx.lineWidth = Math.max(0.5, Math.min(w, h) / 900);
    ctx.beginPath();
    if (["lines", "hatch"].includes(e.protect)) {
      for (let x = -h; x < w + h; x += s) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x + h, h);
        if (e.protect === "hatch") {
          ctx.moveTo(x, h);
          ctx.lineTo(x + h, 0);
        }
      }
    } else if (e.protect === "grid") {
      for (let x = 0; x < w; x += s) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y < h; y += s) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
    } else if (["waves", "zigzag"].includes(e.protect)) {
      for (let y = -s; y < h + s; y += s) {
        ctx.moveTo(0, y);
        for (let x = 0; x < w + s; x += s / 4)
          ctx.lineTo(
            x,
            y +
              (e.protect === "waves"
                ? (Math.sin((x / s) * Math.PI * 2) * s) / 5
                : Math.round(x / (s / 4)) % 2
                  ? s / 5
                  : -s / 5),
          );
      }
    } else if (e.protect === "rings") {
      for (let r = s; r < Math.hypot(w, h); r += s) {
        ctx.moveTo(w / 2 + r, h / 2);
        ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      }
    } else if (e.protect === "rays") {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 30) {
        ctx.moveTo(w / 2, h / 2);
        ctx.lineTo(
          w / 2 + Math.cos(a) * Math.hypot(w, h),
          h / 2 + Math.sin(a) * Math.hypot(w, h),
        );
      }
    } else
      for (let y = s / 2; y < h; y += s)
        for (let x = s / 2; x < w; x += s) {
          if (e.protect === "dots") {
            ctx.moveTo(x + 1, y);
            ctx.arc(x, y, Math.max(1, s / 25), 0, Math.PI * 2);
          } else if (e.protect === "crosses") {
            ctx.moveTo(x - s / 6, y);
            ctx.lineTo(x + s / 6, y);
            ctx.moveTo(x, y - s / 6);
            ctx.lineTo(x, y + s / 6);
          } else {
            for (let a = 0; a <= 6; a++) {
              const xx = x + Math.cos((a * Math.PI) / 3) * s * 0.45,
                yy = y + Math.sin((a * Math.PI) / 3) * s * 0.45;
              a ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
            }
          }
        }
    ctx.stroke();
    ctx.restore();
  }
  function applyColor(ctx, w, h, e) {
    if (
      ![e.brightness, e.contrast, e.saturation, e.warmth, e.tint].some(
        Boolean,
      ) &&
      e.filter === "none"
    )
      return;
    const d = ctx.getImageData(0, 0, w, h),
      p = d.data,
      t = e.strength / 100;
    for (let i = 0; i < p.length; i += 4) {
      let r = p[i],
        g = p[i + 1],
        b = p[i + 2];
      const avg = 0.2126 * r + 0.7152 * g + 0.0722 * b,
        s = 1 + e.saturation / 100,
        c = 1 + e.contrast / 100;
      r =
        (avg + (r - avg) * s - 128) * c +
        128 +
        e.brightness * 1.6 +
        e.warmth * 0.35 +
        e.tint * 0.12;
      g =
        (avg + (g - avg) * s - 128) * c +
        128 +
        e.brightness * 1.6 -
        e.tint * 0.25;
      b =
        (avg + (b - avg) * s - 128) * c +
        128 +
        e.brightness * 1.6 -
        e.warmth * 0.35 +
        e.tint * 0.12;
      let rr = r,
        gg = g,
        bb = b;
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (e.filter === "mono") rr = gg = bb = l;
      else if (e.filter === "sepia") {
        rr = 0.393 * r + 0.769 * g + 0.189 * b;
        gg = 0.349 * r + 0.686 * g + 0.168 * b;
        bb = 0.272 * r + 0.534 * g + 0.131 * b;
      } else if (e.filter === "warm") {
        rr += 20;
        gg += 5;
        bb -= 15;
      } else if (e.filter === "cool") {
        rr -= 12;
        bb += 20;
      } else if (e.filter === "vivid") {
        rr = l + (r - l) * 1.3;
        gg = l + (g - l) * 1.3;
        bb = l + (b - l) * 1.3;
      } else if (e.filter === "fade") {
        rr = r * 0.8 + 35;
        gg = g * 0.8 + 35;
        bb = b * 0.8 + 35;
      } else if (e.filter === "dramatic") {
        rr = (r - 128) * 1.35 + 118;
        gg = (g - 128) * 1.35 + 118;
        bb = (b - 128) * 1.35 + 118;
      }
      p[i] = r + (rr - r) * t;
      p[i + 1] = g + (gg - g) * t;
      p[i + 2] = b + (bb - b) * t;
    }
    ctx.putImageData(d, 0, 0);
  }
  function render(
    canvas,
    image,
    raw,
    assets = new Map(),
    { scale = 1, format = "png", original = false, watermarkOnly = false } = {},
  ) {
    const doc = normalize(raw),
      e = doc.edit,
      iw = image.width || image.naturalWidth,
      ih = image.height || image.naturalHeight;
    if (original) {
      canvas.width = Math.max(1, Math.round(iw * scale));
      canvas.height = Math.max(1, Math.round(ih * scale));
      canvas
        .getContext("2d")
        .drawImage(image, 0, 0, canvas.width, canvas.height);
      return { width: iw, height: ih, boxes: [] };
    }
    const d = dimensions(iw, ih, doc);
    if (d.width * d.height > 32e6 || Math.max(d.width, d.height) > 16384)
      throw new Error(
        "输出尺寸超过 32 百万像素或单边 16,384 像素，请减小尺寸/边框",
      );
    canvas.width = Math.max(1, Math.round(d.width * scale));
    canvas.height = Math.max(1, Math.round(d.height * scale));
    const ctx = canvas.getContext("2d");
    const sw = canvas.width / d.width,
      sh = canvas.height / d.height,
      mx = d.margin * sw,
      my = d.margin * sh,
      pw = Math.max(1, Math.round(d.photoWidth * sw)),
      ph = Math.max(1, Math.round(d.photoHeight * sh));
    if (format === "jpeg" && !watermarkOnly) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (e.frame !== "none" && !watermarkOnly) {
      ctx.fillStyle = e.frame === "film" ? "#151916" : e.frameColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const photo = makeCanvas(pw, ph),
      pctx = photo.getContext("2d", { willReadFrequently: true });
    if (!watermarkOnly) {
      pctx.save();
      if (e.frame === "rounded") {
        pctx.beginPath();
        pctx.roundRect(0, 0, pw, ph, Math.min(pw, ph) * 0.06);
        pctx.clip();
      }
      const crop = cropFor(iw, ih, e);
      const cw = iw * crop.w,
        ch = ih * crop.h,
        ow = e.rotate % 2 ? ch : cw,
        oh = e.rotate % 2 ? cw : ch;
      let sx = pw / ow,
        sy = ph / oh;
      if (e.resizeMode === "contain") sx = sy = Math.min(sx, sy);
      else if (e.resizeMode !== "stretch") sx = sy = Math.max(sx, sy);
      pctx.translate(pw / 2, ph / 2);
      pctx.scale(sx, sy);
      const a = (e.straighten * Math.PI) / 180;
      const z = Math.max(
        (ow * Math.abs(Math.cos(a)) + oh * Math.abs(Math.sin(a))) / ow,
        (ow * Math.abs(Math.sin(a)) + oh * Math.abs(Math.cos(a))) / oh,
      );
      pctx.scale(z, z);
      pctx.rotate(((e.rotate * 90 + e.straighten) * Math.PI) / 180);
      pctx.scale(e.flipX ? -1 : 1, e.flipY ? -1 : 1);
      pctx.drawImage(
        image,
        iw * crop.x,
        ih * crop.y,
        cw,
        ch,
        -cw / 2,
        -ch / 2,
        cw,
        ch,
      );
      pctx.restore();
      applyColor(pctx, pw, ph, e);
    }
    pctx.save();
    if (e.frame === "rounded" && !watermarkOnly) {
      pctx.beginPath();
      pctx.roundRect(0, 0, pw, ph, Math.min(pw, ph) * 0.06);
      pctx.clip();
    }
    if (!watermarkOnly) protect(pctx, pw, ph, e);
    const boxes = [];
    for (const l of doc.layers) {
      const box = drawLayer(pctx, pw, ph, l, assets);
      if (box) boxes.push({ ...box, x: box.x + mx, y: box.y + my });
    }
    pctx.restore();
    ctx.save();
    if (e.frame === "shadow" && !watermarkOnly) {
      ctx.shadowColor = "#0006";
      ctx.shadowBlur = Math.min(canvas.width, canvas.height) * 0.025;
      ctx.shadowOffsetY = my * 0.4;
    }
    ctx.drawImage(photo, mx, my);
    ctx.restore();
    photo.width = photo.height = 1;
    if (e.frame === "gallery" && !watermarkOnly) {
      ctx.strokeStyle = "#8888";
      ctx.lineWidth = Math.max(1, sw);
      ctx.strokeRect(mx * 0.7, my * 0.7, pw + mx * 0.6, ph + my * 0.6);
    }
    if (e.frame === "film" && !watermarkOnly) {
      ctx.fillStyle = "#ddddcc";
      for (let y = my / 2; y < canvas.height; y += Math.max(5, my * 1.5)) {
        ctx.fillRect(mx * 0.2, y, mx * 0.4, my * 0.6);
        ctx.fillRect(canvas.width - mx * 0.6, y, mx * 0.4, my * 0.6);
      }
    }
    if (e.frame === "instant" && !watermarkOnly) {
      ctx.fillStyle = "#40463e";
      ctx.font = `${Math.max(8, d.bottom * sh * 0.22)}px ${fonts.hand}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        e.caption,
        canvas.width / 2,
        my + ph + (d.bottom * sh) / 2,
        pw * 0.9,
      );
    }
    return { ...d, boxes, photo: { x: mx, y: my, w: pw, h: ph } };
  }
  function hasMark(doc) {
    return (
      doc.layers.some(
        (l) => l.visible && (l.type === "logo" ? l.asset : l.text.trim()),
      ) || doc.edit.protect !== "none"
    );
  }
  const api = {
    clone,
    layer,
    defaults,
    normalize,
    dimensions,
    cropFor,
    geometry,
    render,
    hasMark,
    fonts,
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WatermarkStudio = api;
})(globalThis);
