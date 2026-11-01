/* 留印 · GPL-3.0-only. Based on the browser-local workflow of jzsn2018/offline-photo-watermark. */
(function (root) {
  "use strict";
  const defaults = Object.freeze({
    text: "仅供办理业务使用 · 他用无效",
    color: "#2d6553",
    opacity: 24,
    size: 3.2,
    spacing: 2.5,
    angle: -30,
    mode: "tile",
    position: 8,
    format: "png",
    quality: 92,
  });
  const clamp = (value, min, max, fallback) =>
    Number.isFinite(Number(value))
      ? Math.min(max, Math.max(min, Number(value)))
      : fallback;
  function normalize(input = {}) {
    const c = { ...defaults, ...input };
    return {
      text: String(c.text).slice(0, 120),
      color: /^#[\da-f]{6}$/i.test(c.color) ? c.color : defaults.color,
      opacity: clamp(c.opacity, 5, 100, 24),
      size: clamp(c.size, 1, 8, 3.2),
      spacing: clamp(c.spacing, 1, 5, 2.5),
      angle: clamp(c.angle, -90, 90, -30),
      mode: c.mode === "single" ? "single" : "tile",
      position: Math.round(clamp(c.position, 0, 8, 8)),
      format: ["png", "jpeg", "webp"].includes(c.format) ? c.format : "png",
      quality: clamp(c.quality, 50, 100, 92),
    };
  }
  function rotatedBounds(width, height, radians) {
    return {
      width:
        Math.abs(width * Math.cos(radians)) +
        Math.abs(height * Math.sin(radians)),
      height:
        Math.abs(width * Math.sin(radians)) +
        Math.abs(height * Math.cos(radians)),
    };
  }
  function layout(ctx, width, height, input) {
    const c = normalize(input),
      lines = c.text.trim().split(/\r?\n/);
    let fontSize = Math.max(1, (Math.min(width, height) * c.size) / 100);
    const font = () =>
      `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.font = font();
    let textWidth = Math.max(
      ...lines.map((line) => ctx.measureText(line).width),
      fontSize,
    );
    let textHeight = lines.length * fontSize * 1.45;
    const radians = (c.angle * Math.PI) / 180;
    if (c.mode === "single") {
      const box = rotatedBounds(textWidth, textHeight, radians);
      const fit = Math.min(
        1,
        (width * 0.9) / box.width,
        (height * 0.9) / box.height,
      );
      fontSize *= fit;
      textWidth *= fit;
      textHeight *= fit;
      ctx.font = font();
    }
    return { c, lines, fontSize, textWidth, textHeight, radians };
  }
  function render(
    canvas,
    image,
    input,
    {
      width = image.width || image.naturalWidth,
      height = image.height || image.naturalHeight,
      original = false,
    } = {},
  ) {
    const c = normalize(input);
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("当前浏览器无法创建图片画布。");
    // A white background makes JPEG preview and export agree, including transparent inputs.
    if (c.format === "jpeg" && !original) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    if (original || !c.text.trim()) return canvas;
    const { lines, fontSize, textWidth, textHeight, radians } = layout(
      ctx,
      canvas.width,
      canvas.height,
      c,
    );
    ctx.save();
    ctx.fillStyle = c.color;
    ctx.globalAlpha = c.opacity / 100;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    function block(x, y) {
      lines.forEach((line, index) =>
        ctx.fillText(
          line,
          x,
          y + (index - (lines.length - 1) / 2) * fontSize * 1.45,
        ),
      );
    }
    if (c.mode === "single") {
      const box = rotatedBounds(textWidth, textHeight, radians),
        margin = Math.min(canvas.width, canvas.height) * 0.04;
      const xs = [
        box.width / 2 + margin,
        canvas.width / 2,
        canvas.width - box.width / 2 - margin,
      ];
      const ys = [
        box.height / 2 + margin,
        canvas.height / 2,
        canvas.height - box.height / 2 - margin,
      ];
      ctx.translate(xs[c.position % 3], ys[Math.floor(c.position / 3)]);
      ctx.rotate(radians);
      block(0, 0);
    } else {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(radians);
      const area = rotatedBounds(canvas.width, canvas.height, radians);
      let stepX = textWidth + fontSize * c.spacing * 2,
        stepY = textHeight + fontSize * c.spacing;
      // Bound work for extremely narrow panoramas and very small text.
      const estimated =
        (Math.ceil(area.width / stepX) + 4) *
        (Math.ceil(area.height / stepY) + 4);
      const adjustment = Math.max(1, Math.sqrt(estimated / 16000));
      stepX *= adjustment;
      stepY *= adjustment;
      const columns = Math.ceil(area.width / stepX / 2) + 1,
        rows = Math.ceil(area.height / stepY / 2) + 1;
      for (let row = -rows; row <= rows; row++)
        for (let col = -columns; col <= columns; col++)
          block(col * stepX + (row % 2 ? stepX / 2 : 0), row * stepY);
    }
    ctx.restore();
    return canvas;
  }
  function outputName(name, format, used = new Set()) {
    const ext = format === "jpeg" ? "jpg" : format;
    let stem =
      String(name)
        .replace(/\.[^.]+$/, "")
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
        .replace(/^\.+|[. ]+$/g, "")
        .slice(0, 90) || "图片";
    let result = `${stem}_水印.${ext}`,
      i = 2;
    while (used.has(result.toLowerCase()))
      result = `${stem}_水印_${i++}.${ext}`;
    used.add(result.toLowerCase());
    return result;
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
    return n >>> 0;
  });
  function crc32(data) {
    let crc = 0xffffffff;
    for (const byte of data) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function zip(files, date = new Date()) {
    if (files.length > 65535) throw new Error("ZIP 文件数量超限。");
    const body = [],
      directory = [];
    let offset = 0,
      centralSize = 0;
    const time =
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      (date.getSeconds() >> 1);
    const day =
      ((Math.min(2107, Math.max(1980, date.getFullYear())) - 1980) << 9) |
      ((date.getMonth() + 1) << 5) |
      date.getDate();
    for (const file of files) {
      const name = new TextEncoder().encode(file.name),
        data = file.data,
        crc = crc32(data);
      if (name.length > 65535 || offset + data.length > 0xffffffff)
        throw new Error("ZIP 文件过大。");
      const local = new Uint8Array(30 + name.length),
        lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true);
      lv.setUint16(10, time, true);
      lv.setUint16(12, day, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, data.length, true);
      lv.setUint32(22, data.length, true);
      lv.setUint16(26, name.length, true);
      local.set(name, 30);
      const central = new Uint8Array(46 + name.length),
        cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(12, time, true);
      cv.setUint16(14, day, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true);
      cv.setUint16(28, name.length, true);
      cv.setUint32(42, offset, true);
      central.set(name, 46);
      body.push(local, data);
      directory.push(central);
      offset += local.length + data.length;
      centralSize += central.length;
    }
    if (offset + centralSize > 0xffffffff) throw new Error("ZIP 文件过大。");
    const end = new Uint8Array(22),
      ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    return new Blob([...body, ...directory, end], { type: "application/zip" });
  }
  const api = {
    defaults,
    normalize,
    render,
    layout,
    rotatedBounds,
    outputName,
    crc32,
    zip,
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WatermarkCore = api;
})(globalThis);
