/* Shared format detection and image limits. GPL-3.0-only. */
(function (root) {
  "use strict";
  const formats = {
    jpeg: {
      label: "JPG",
      mime: "image/jpeg",
      extensions: ["jpg", "jpeg", "jpe", "jfif"],
    },
    png: { label: "PNG", mime: "image/png", extensions: ["png", "apng"] },
    webp: { label: "WebP", mime: "image/webp", extensions: ["webp"] },
    gif: { label: "GIF", mime: "image/gif", extensions: ["gif"] },
    bmp: { label: "BMP", mime: "image/bmp", extensions: ["bmp", "dib"] },
    heic: {
      label: "HEIC / HEIF",
      mime: "image/heic",
      extensions: ["heic", "heif", "heics", "heifs", "hif"],
    },
    avif: { label: "AVIF", mime: "image/avif", extensions: ["avif", "avifs"] },
    tiff: { label: "TIFF", mime: "image/tiff", extensions: ["tif", "tiff"] },
    svg: { label: "SVG", mime: "image/svg+xml", extensions: ["svg"] },
    ico: { label: "ICO", mime: "image/x-icon", extensions: ["ico"] },
  };
  const accept = Object.values(formats)
    .flatMap((f) => [f.mime, ...f.extensions.map((ext) => "." + ext)])
    .concat(
      "image/heif",
      "image/heic-sequence",
      "image/heif-sequence",
      "image/vnd.microsoft.icon",
      "image/apng",
    )
    .join(",");
  const limits = Object.freeze({ maxPixels: 32e6, maxDimension: 16384 });
  function checkDimensions(width, height, maxPixels = limits.maxPixels) {
    if (
      !Number.isSafeInteger(width) ||
      !Number.isSafeInteger(height) ||
      width < 1 ||
      height < 1
    )
      throw new Error("图片尺寸无效，文件可能已损坏");
    if (
      width > limits.maxDimension ||
      height > limits.maxDimension ||
      width * height > limits.maxPixels
    )
      throw new Error("尺寸超限（单图最多 32 百万像素，单边最多 16,384 像素）");
    if (width * height > maxPixels)
      throw new Error("已达到总像素上限，请先导出并清理部分图片");
  }
  function detect(bytes, name = "", mime = "") {
    const a = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const text = (start, end) => String.fromCharCode(...a.subarray(start, end));
    const ext = name.toLowerCase().split(".").pop();
    if (/^(pdf|psd|psb|ai|eps|raw|dng|cr2|cr3|nef|arw|orf|raf|rw2)$/.test(ext))
      return null;
    if (a[0] === 0xff && a[1] === 0xd8 && a[2] === 0xff) return "jpeg";
    if (text(0, 8) === "\x89PNG\r\n\x1a\n") return "png";
    if (text(0, 6) === "GIF87a" || text(0, 6) === "GIF89a") return "gif";
    if (text(0, 4) === "RIFF" && text(8, 12) === "WEBP") return "webp";
    if (text(0, 2) === "BM") return "bmp";
    if (["II*\0", "MM\0*", "II+\0", "MM\0+"].includes(text(0, 4)))
      return "tiff";
    if (
      a.length >= 6 &&
      a[0] === 0 &&
      a[1] === 0 &&
      a[2] === 1 &&
      a[3] === 0 &&
      (a[4] || a[5])
    )
      return "ico";
    if (a.length >= 16 && text(4, 8) === "ftyp") {
      const size = new DataView(a.buffer, a.byteOffset, a.byteLength).getUint32(
        0,
      );
      const brands = [text(8, 12)];
      for (let i = 16; i + 4 <= Math.min(size, a.length, 1024); i += 4)
        brands.push(text(i, i + 4));
      if (brands.some((brand) => ["avif", "avis"].includes(brand)))
        return "avif";
      if (
        brands.some((brand) =>
          [
            "heic",
            "heix",
            "hevc",
            "hevx",
            "heim",
            "heis",
            "hevm",
            "hevs",
            "mif1",
            "msf1",
          ].includes(brand),
        )
      )
        return "heic";
    }
    if (/<svg(?:\s|>)/i.test(new TextDecoder().decode(a.subarray(0, 4096))))
      return "svg";
    // A known extension/MIME can still reach the decoder and produce a useful corrupt-file error.
    return (
      Object.keys(formats).find(
        (key) =>
          formats[key].extensions.includes(ext) ||
          formats[key].mime === mime.toLowerCase(),
      ) || (mime === "image/heif" ? "heic" : null)
    );
  }
  function orientationTransform(orientation, w, h) {
    return (
      {
        1: [1, 0, 0, 1, 0, 0],
        2: [-1, 0, 0, 1, w, 0],
        3: [-1, 0, 0, -1, w, h],
        4: [1, 0, 0, -1, 0, h],
        5: [0, 1, 1, 0, 0, 0],
        6: [0, 1, -1, 0, h, 0],
        7: [0, -1, -1, 0, h, w],
        8: [0, -1, 1, 0, 0, w],
      }[orientation] || [1, 0, 0, 1, 0, 0]
    );
  }
  const api = {
    formats,
    accept,
    limits,
    checkDimensions,
    detect,
    orientationTransform,
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WatermarkFormats = api;
})(globalThis);
