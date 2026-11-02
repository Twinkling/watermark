export const artFonts = window.WatermarkFonts || [];
export const systemFonts = [
  ["sans", "现代黑体"],
  ["serif", "文艺宋体"],
  ["mono", "等宽字体"],
  ["hand", "系统楷体"],
];
const pending = new Map();
export function artFontPreviewFamily(font) {
  return font.preview?.data ? `${font.id}_preview` : font.id;
}
export function ensureArtFont(id, preview = false) {
  const font = artFonts.find((f) => f.id === id);
  if (!font)
    return id.startsWith("art_")
      ? Promise.reject(new Error("缺少内置字体，请使用最新版本"))
      : Promise.resolve();
  const family = preview ? artFontPreviewFamily(font) : id;
  const data = preview && font.preview?.data ? font.preview.data : font.data;
  if (!pending.has(family)) {
    const face = new FontFace(family, `url("${data}")`, {
      weight: font.variable ? "400 700" : "400",
    });
    pending.set(
      family,
      face
        .load()
        .then(() => {
          document.fonts.add(face);
        })
        .catch(() => {
          pending.delete(family);
          throw new Error(font.name + "加载失败，请重新选择");
        }),
    );
  }
  return pending.get(family);
}
