// Normalized source-image coordinates; ratio is width / height in this space.
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export function moveCrop(c, dx, dy) {
  return {
    ...c,
    x: clamp(c.x + dx, 0, 1 - c.w),
    y: clamp(c.y + dy, 0, 1 - c.h),
  };
}
export function resizeCrop(c, corner, dx, dy, ratio = 0) {
  const west = corner.includes("w"),
    north = corner.includes("n");
  const ax = west ? c.x + c.w : c.x,
    ay = north ? c.y + c.h : c.y;
  const maxW = west ? ax : 1 - ax,
    maxH = north ? ay : 1 - ay;
  let w = clamp(c.w + (west ? -dx : dx), 0.01, maxW),
    h = clamp(c.h + (north ? -dy : dy), 0.01, maxH);
  if (ratio > 0) {
    w = Math.abs(dx) >= Math.abs(dy * ratio) ? w : h * ratio;
    w = clamp(
      w,
      Math.min(Math.max(0.01, 0.01 * ratio), maxW, maxH * ratio),
      Math.min(maxW, maxH * ratio),
    );
    h = w / ratio;
  }
  return { x: west ? ax - w : ax, y: north ? ay - h : ay, w, h };
}
export function drawCrop(start, end, ratio = 0) {
  const x = clamp(start.x, 0, 1),
    y = clamp(start.y, 0, 1);
  const west = end.x < x,
    north = end.y < y;
  // A small initial rectangle gives the same clamped resize behavior at edges.
  const c = {
    x: west ? Math.max(0, x - 0.01) : Math.min(0.99, x),
    y: north ? Math.max(0, y - 0.01) : Math.min(0.99, y),
    w: 0.01,
    h: 0.01,
  };
  return resizeCrop(
    c,
    (north ? "n" : "s") + (west ? "w" : "e"),
    (west ? -1 : 1) * (Math.abs(end.x - x) - 0.01),
    (north ? -1 : 1) * (Math.abs(end.y - y) - 0.01),
    ratio,
  );
}
