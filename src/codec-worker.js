/* Runs only inside an ephemeral local Worker, appended after the bundled codecs. */
self.onmessage = async ({ data: { buffer, format, maxPixels } }) => {
  let decoder, images, lib;
  try {
    let width,
      height,
      rgba,
      orientation = 1,
      pageCount = 1;
    if (format === "heic") {
      lib = buildLibheif();
      decoder = new lib.HeifDecoder();
      images = decoder.decode(new Uint8Array(buffer));
      if (!images.length)
        throw new Error("HEIC / HEIF 文件已损坏，或使用了尚不支持的编码");
      const image = images.find((item) => item.is_primary()) || images[0];
      width = image.get_width();
      height = image.get_height();
      pageCount = images.length;
      WatermarkFormats.checkDimensions(width, height, maxPixels);
      const result = await new Promise((resolve, reject) => {
        image.display(new ImageData(width, height), (pixels) =>
          pixels
            ? resolve(pixels)
            : reject(new Error("HEIC 像素解码失败，请尝试导出为 JPG 后重试")),
        );
      });
      rgba = result.data;
    } else {
      const view = new DataView(buffer),
        little = view.getUint16(0) === 0x4949;
      if (view.getUint16(2, little) !== 42)
        throw new Error("暂不支持 BigTIFF，请另存为标准 TIFF");
      // Reject cyclic/truncated directories before calling the TIFF decoder.
      let offset = view.getUint32(4, little);
      const visited = new Set();
      while (offset) {
        if (
          visited.has(offset) ||
          visited.size >= 256 ||
          offset + 2 > buffer.byteLength
        )
          throw new Error("TIFF 页面目录无效或页数过多");
        visited.add(offset);
        const count = view.getUint16(offset, little),
          end = offset + 2 + count * 12;
        if (count > 4096 || end + 4 > buffer.byteLength)
          throw new Error("TIFF 页面目录已损坏");
        offset = view.getUint32(end, little);
      }
      const pages = UTIF.decode(buffer).filter(
        (page) => page.t256 && page.t257,
      );
      if (!pages.length) throw new Error("TIFF 中没有可读取的图片");
      const page = pages[0];
      width = page.t256[0];
      height = page.t257[0];
      pageCount = pages.length;
      WatermarkFormats.checkDimensions(width, height, maxPixels);
      if (
        page.t284?.[0] === 2 ||
        page.t339?.some((value) => value !== 1) ||
        page.t33422
      )
        throw new Error(
          "此 TIFF 使用特殊色彩或 RAW 数据，请先转换为普通 RGB TIFF / PNG",
        );
      if (page.t258?.some((value) => value > 16))
        throw new Error("暂不支持此 TIFF 位深，请转换为 8 位或 16 位图片");
      if (!page.t273 && !page.t324) throw new Error("TIFF 缺少像素数据");
      UTIF.decodeImage(buffer, page, pages);
      rgba = UTIF.toRGBA8(page);
      if (
        page.t262?.[0] === 2 &&
        page.t338?.[0] === 1 &&
        page.t277?.[0] === 4
      ) {
        for (let i = 0; i < rgba.length; i += 4) {
          const alpha = rgba[i + 3];
          for (let c = 0; c < 3; c++)
            rgba[i + c] = alpha
              ? Math.min(255, Math.round((rgba[i + c] * 255) / alpha))
              : 0;
        }
      }
      orientation = page.t274?.[0] || 1;
    }
    self.postMessage(
      { width, height, rgba: rgba.buffer, orientation, pageCount },
      [rgba.buffer],
    );
  } catch (error) {
    self.postMessage({ error: error.message || "图片解码失败" });
  } finally {
    if (images) images.forEach((image) => image.free());
    if (decoder?.decoder) lib.heif_context_free(decoder.decoder);
  }
};
