export const artFonts = window.WatermarkFonts || [];
export const systemFonts = [
  ["sans", "现代黑体"],
  ["serif", "文艺宋体"],
  ["mono", "等宽字体"],
  ["hand", "系统楷体"],
];
const pending = new Map();
export function ensureArtFont(id) {
  const font = artFonts.find((f) => f.id === id);
  if (!font)
    return id.startsWith("art_")
      ? Promise.reject(new Error("缺少内置字体，请使用最新版本"))
      : Promise.resolve();
  if (!pending.has(id)) {
    const face = new FontFace(id, `url("${font.data}")`, {
      weight: font.variable ? "400 700" : "400",
    });
    pending.set(
      id,
      face
        .load()
        .then(() => {
          document.fonts.add(face);
        })
        .catch(() => {
          pending.delete(id);
          throw new Error(font.name + "加载失败，请重新选择");
        }),
    );
  }
  return pending.get(id);
}
