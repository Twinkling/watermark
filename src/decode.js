/* Unified local decode path. No remote resources or persistent storage. */
(function (root) {
  "use strict";
  const Formats = root.WatermarkFormats;
  let codecLoading;
  function ensureCodecs() {
    if (root.WatermarkCodecSource) return Promise.resolve();
    if (!root.WatermarkCodecURL)
      return Promise.reject(new Error("本地解码器不可用，请使用完整离线文件"));
    if (!codecLoading) {
      codecLoading = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        let timer;
        const finish = (error) => {
          clearTimeout(timer);
          script.remove();
          error ? reject(error) : resolve();
        };
        script.src = root.WatermarkCodecURL;
        script.onload = () => finish(root.WatermarkCodecSource ? null : new Error("解码器加载失败，请重试"));
        script.onerror = () => finish(new Error("解码器下载失败，请检查网络后重试"));
        timer = setTimeout(() => finish(new Error("解码器下载超时，请重试")), 30000);
        document.head.appendChild(script);
      }).catch((error) => {
        codecLoading = null;
        throw error;
      });
    }
    return codecLoading;
  }
  async function nativeDecode(blob, maxPixels) {
    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(blob);
        try {
          Formats.checkDimensions(bitmap.width, bitmap.height, maxPixels);
          return bitmap;
        } catch (error) {
          bitmap.close();
          throw error;
        }
      } catch (error) {
        if (error.message?.includes("超限") || error.message?.includes("上限"))
          throw error;
      }
    }
    const url = URL.createObjectURL(blob),
      image = new Image();
    try {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () =>
          reject(new Error("图片已损坏或当前浏览器无法解码"));
        image.src = url;
      });
      Formats.checkDimensions(
        image.naturalWidth,
        image.naturalHeight,
        maxPixels,
      );
      // Freeze animated formats once; preview changes must not advance the source frame.
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d").drawImage(image, 0, 0);
      return canvas;
    } finally {
      URL.revokeObjectURL(url);
      image.src = "";
    }
  }
  async function workerDecode(file, format, maxPixels) {
    if (typeof Worker === "undefined")
      throw new Error("本地解码器不可用，请使用完整离线文件或更新浏览器");
    await ensureCodecs();
    const buffer = await file.arrayBuffer();
    const url = URL.createObjectURL(
      new Blob([root.WatermarkCodecSource], { type: "application/javascript" }),
    );
    let worker, timer;
    try {
      const result = await new Promise((resolve, reject) => {
        worker = new Worker(url);
        timer = setTimeout(
          () => reject(new Error("图片解码超过 60 秒，请先压缩或转换此文件")),
          60000,
        );
        worker.onerror = (event) => {
          event.preventDefault();
          reject(new Error("本地解码器运行失败，请检查文件或尝试另一张图片"));
        };
        worker.onmessage = ({ data }) =>
          data.error ? reject(new Error(data.error)) : resolve(data);
        worker.postMessage({ buffer, format, maxPixels }, [buffer]);
      });
      const raw = document.createElement("canvas");
      raw.width = result.width;
      raw.height = result.height;
      try {
        raw
          .getContext("2d")
          .putImageData(
            new ImageData(
              new Uint8ClampedArray(result.rgba),
              result.width,
              result.height,
            ),
            0,
            0,
          );
        const orientation = result.orientation;
        if (orientation > 1 && orientation <= 8) {
          const oriented = document.createElement("canvas");
          oriented.width = orientation >= 5 ? raw.height : raw.width;
          oriented.height = orientation >= 5 ? raw.width : raw.height;
          const ctx = oriented.getContext("2d");
          ctx.setTransform(
            ...Formats.orientationTransform(orientation, raw.width, raw.height),
          );
          ctx.drawImage(raw, 0, 0);
          return { image: oriented, pageCount: result.pageCount };
        }
        const bitmap = await createImageBitmap(raw);
        return { image: bitmap, pageCount: result.pageCount };
      } finally {
        raw.width = raw.height = 1;
      }
    } finally {
      clearTimeout(timer);
      worker?.terminate();
      URL.revokeObjectURL(url);
    }
  }
  function svgBlob(source, maxPixels) {
    if (/<!DOCTYPE|<!ENTITY/i.test(source))
      throw new Error("SVG 包含外部文档声明，请另存为独立 SVG");
    const doc = new DOMParser().parseFromString(source, "image/svg+xml"),
      svg = doc.documentElement;
    if (
      doc.querySelector("parsererror") ||
      svg.localName !== "svg" ||
      svg.namespaceURI !== "http://www.w3.org/2000/svg"
    )
      throw new Error("SVG 文件格式无效");
    if (doc.querySelector("script, foreignObject, iframe, object, embed"))
      throw new Error("SVG 含脚本或嵌入网页，请先导出为普通 SVG / PNG");
    const safeReference = (value) =>
      value.startsWith("#") ||
      /^data:image\/(png|jpeg|gif|webp|avif|bmp);base64,/i.test(value);
    for (const node of doc.querySelectorAll("*")) {
      for (const attr of [...node.attributes]) {
        if (/^on/i.test(attr.name))
          throw new Error("SVG 含交互脚本，请先导出为普通 SVG / PNG");
        if (
          attr.localName === "href" &&
          attr.value &&
          !safeReference(attr.value.trim())
        )
          throw new Error("SVG 引用了外部资源，请先把图片与字体嵌入 SVG");
      }
    }
    const css =
      [...doc.querySelectorAll("style")]
        .map((node) => node.textContent)
        .join("\n") +
      [...doc.querySelectorAll("*")]
        .flatMap((node) =>
          [...node.attributes]
            .filter((attr) => attr.localName !== "href")
            .map((attr) => attr.value),
        )
        .join("\n");
    if (/@import|@font-face|\\/.test(css))
      throw new Error("SVG 包含外部或不支持的样式，请先转换为 PNG");
    for (const match of css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi))
      if (!safeReference(match[2].trim()))
        throw new Error("SVG 引用了外部资源，请先嵌入资源再导入");
    const vb = (svg.getAttribute("viewBox") || "")
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    const hasViewBox =
      vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0;
    const length = (value) => {
      const match = (value || "")
        .trim()
        .match(/^([\d.]+)(px|in|cm|mm|pt|pc)?$/);
      return match
        ? Number(match[1]) *
            ({
              px: 1,
              in: 96,
              cm: 96 / 2.54,
              mm: 96 / 25.4,
              pt: 96 / 72,
              pc: 16,
            }[match[2]] || 1)
        : 0;
    };
    let width = length(svg.getAttribute("width")),
      height = length(svg.getAttribute("height"));
    if (hasViewBox) {
      if (!width && !height) {
        width = vb[2];
        height = vb[3];
      } else if (!width) width = (height * vb[2]) / vb[3];
      else if (!height) height = (width * vb[3]) / vb[2];
    }
    width = Math.round(width || 300);
    height = Math.round(height || 150);
    Formats.checkDimensions(width, height, maxPixels);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    return new Blob([new XMLSerializer().serializeToString(svg)], {
      type: "image/svg+xml",
    });
  }
  async function decode(
    file,
    { maxPixels = Formats.limits.maxPixels, onStatus = () => {} } = {},
  ) {
    const header = new Uint8Array(await file.slice(0, 65536).arrayBuffer());
    const format = Formats.detect(header, file.name, file.type);
    if (!format)
      throw new Error(
        "暂不支持此文件。支持 HEIC / HEIF、JPG、PNG、WebP、AVIF、GIF、BMP、TIFF、SVG、ICO；不支持 PDF、PSD 与相机 RAW",
      );
    let image,
      pageCount = 1;
    const notes = [];
    onStatus(`正在读取 ${Formats.formats[format].label}`);
    if (format === "tiff") {
      onStatus("正在本机解码 TIFF…");
      ({ image, pageCount } = await workerDecode(file, format, maxPixels));
    } else if (format === "heic") {
      try {
        image = await nativeDecode(
          new Blob([file], { type: "image/heic" }),
          maxPixels,
        );
      } catch (error) {
        if (error.message?.includes("超限") || error.message?.includes("上限"))
          throw error;
        onStatus("正在本机解码 HEIC / HEIF，首次读取可能稍慢…");
        ({ image, pageCount } = await workerDecode(file, format, maxPixels));
      }
    } else if (format === "svg") {
      image = await nativeDecode(
        svgBlob(await file.text(), maxPixels),
        maxPixels,
      );
      notes.push("SVG 已按画布尺寸转为静态位图");
    } else {
      try {
        image = await nativeDecode(
          new Blob([file], { type: Formats.formats[format].mime }),
          maxPixels,
        );
      } catch (error) {
        if (format === "avif" && !/上限|超限/.test(error.message))
          throw new Error(
            "AVIF 无法解码，请检查文件并使用支持 AVIF 的新版浏览器",
          );
        throw error;
      }
    }
    if (pageCount > 1)
      notes.push(
        format === "tiff"
          ? `TIFF 共 ${pageCount} 页，本次仅导入第一页`
          : `HEIF 含 ${pageCount} 张图片，本次仅导入主图`,
      );
    const ascii = new TextDecoder("latin1").decode(header);
    if (
      format === "gif" ||
      (format === "webp" && ascii.slice(12, 16) === "VP8X" && header[20] & 2) ||
      (format === "png" && ascii.includes("acTL")) ||
      (format === "avif" && ascii.slice(8, 64).includes("avis"))
    )
      notes.push("动画格式按静态首帧导入，不保留动画");
    return { image, format, notes };
  }
  root.WatermarkDecode = { decode };
})(globalThis);
