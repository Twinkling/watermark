import { moveCrop, resizeCrop, drawCrop } from "./geometry.mjs";
import { HelpTip } from "./Tooltip.jsx";
import React, { useLayoutEffect, useRef, useState } from "react";
import {
  RotateCw,
  MoveDiagonal2,
  MousePointer2,
  Scan,
  ZoomIn,
} from "lucide-react";
import {
  S,
  E,
  item,
  effective,
  selected,
  setUI,
  selectLayer,
  changeScope,
  begin,
  commit,
  patchLayer,
  updateCrop,
} from "./store.js";
import { Button } from "./components.jsx";

export default function Preview({
  photo,
  document,
  original,
  zoom,
  cropMode,
  selectedId,
}) {
  const stage = useRef(),
    wrap = useRef(),
    canvas = useRef(),
    render = useRef(),
    drag = useRef();
  const [bounds, setBounds] = useState({ width: 800, height: 600 }),
    [view, setView] = useState(null),
    [error, setError] = useState(""),
    [guide, setGuide] = useState({});
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setBounds(entry.contentRect),
    );
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (!photo) return;
    const frame = requestAnimationFrame(() => {
      try {
        const isOriginal = original || cropMode,
          d = isOriginal
            ? photo
            : E.dimensions(photo.width, photo.height, document);
        const fit = Math.min(
          1,
          Math.max(80, bounds.width) / d.width,
          Math.max(80, bounds.height) / d.height,
        );
        const cssScale = zoom ? 1 : fit,
          scale = Math.min(
            1,
            cssScale * Math.min(devicePixelRatio, 2),
            2400 / Math.max(d.width, d.height),
          );
        const result = E.render(
          canvas.current,
          photo.image,
          document,
          S.assets,
          { scale, original: isOriginal, format: S.output.format },
        );
        const width = d.width * cssScale,
          height = d.height * cssScale,
          ratio = width / canvas.current.width;
        render.current = { ...result, ratio, width, height };
        setView(render.current);
        setError("");
      } catch (e) {
        setError(e.message);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [photo, document, original, zoom, cropMode, bounds, S.output.format]);
  const point = (e) => {
    const r = wrap.current.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / render.current.ratio,
      y: (e.clientY - r.top) / render.current.ratio,
    };
  };
  const down = (e) => {
    if (
      S.busy ||
      S.original ||
      !render.current ||
      e.button !== 0 ||
      drag.current
    )
      return;
    if (!cropMode && photo.doc && S.scope === "all") changeScope("current");
    const p = point(e),
      r = render.current;
    if (cropMode) {
      drag.current = {
        type: "crop",
        start: {
          x: p.x / canvas.current.width,
          y: p.y / canvas.current.height,
        },
        crop: { ...S.cropDraft.crop },
        handle: e.target.closest("[data-crop-handle]")?.dataset.cropHandle,
        move: !!e.target.closest("[data-crop-body]"),
      };
    } else {
      const own = e.target.closest("[data-selection]");
      const g = own
        ? r.boxes.find((b) => b.id === selected()?.id)
        : [...r.boxes].reverse().find((g) => {
            if (g.tile) return false;
            const dx = p.x - g.x,
              dy = p.y - g.y;
            return (
              Math.abs(dx * Math.cos(g.angle) + dy * Math.sin(g.angle)) <=
                g.w / 2 &&
              Math.abs(-dx * Math.sin(g.angle) + dy * Math.cos(g.angle)) <=
                g.h / 2
            );
          });
      if (!g) return;
      selectLayer(g.id);
      drag.current = {
        type: e.target.closest("[data-handle]")?.dataset.handle || "move",
        start: p,
        g,
        photo: { ...r.photo },
        layer: { ...selected() },
      };
    }
    drag.current.pointer = e.pointerId;
    if (!cropMode) begin();
    wrap.current.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const move = (e) => {
    const a = drag.current;
    if (!a || a.pointer !== e.pointerId) return;
    const p = point(e);
    if (a.type === "crop") {
      const q = {
          x: p.x / canvas.current.width,
          y: p.y / canvas.current.height,
        },
        dx = q.x - a.start.x,
        dy = q.y - a.start.y,
        ratio = S.cropRatio / (photo.width / photo.height);
      updateCrop(
        a.handle
          ? resizeCrop(a.crop, a.handle, dx, dy, ratio)
          : a.move
            ? moveCrop(a.crop, dx, dy)
            : drawCrop(a.start, q, ratio),
      );
      return;
    }
    if (a.type === "resize")
      patchLayer(
        {
          size:
            (a.layer.size * Math.hypot(p.x - a.g.x, p.y - a.g.y)) /
            Math.max(1, Math.hypot(a.start.x - a.g.x, a.start.y - a.g.y)),
        },
        true,
      );
    else if (a.type === "rotate") {
      let angle =
        a.layer.angle +
        ((Math.atan2(p.y - a.g.y, p.x - a.g.x) -
          Math.atan2(a.start.y - a.g.y, a.start.x - a.g.x)) *
          180) /
          Math.PI;
      if (e.shiftKey) angle = Math.round(angle / 15) * 15;
      patchLayer({ angle: ((angle + 540) % 360) - 180 }, true);
    } else {
      let x = (a.g.x - a.photo.x + p.x - a.start.x) / a.photo.w,
        y = (a.g.y - a.photo.y + p.y - a.start.y) / a.photo.h;
      const snapX = Math.abs(x - 0.5) < 0.015,
        snapY = Math.abs(y - 0.5) < 0.015;
      if (snapX) x = 0.5;
      if (snapY) y = 0.5;
      setGuide({
        x: snapX ? (a.photo.x + a.photo.w / 2) * view.ratio : null,
        y: snapY ? (a.photo.y + a.photo.h / 2) * view.ratio : null,
      });
      patchLayer({ x, y }, true);
    }
  };
  const up = (e) => {
    if (!drag.current || drag.current.pointer !== e.pointerId) return;
    drag.current = null;
    if (!cropMode) commit("在画布调整水印");
    setGuide({});
    if (wrap.current.hasPointerCapture(e.pointerId))
      wrap.current.releasePointerCapture(e.pointerId);
  };
  const g = view?.boxes.find((b) => b.id === selectedId && !b.tile),
    crop =
      S.cropDraft?.crop ||
      (photo ? E.cropFor(photo.width, photo.height, document.edit) : null);
  const dimensions = E.dimensions(
    photo.width,
    photo.height,
    cropMode
      ? { ...document, edit: { ...document.edit, ...S.cropDraft } }
      : document,
  );
  return (
    <>
      <div className={"preview-stage " + (zoom ? "zoomed" : "")} ref={stage}>
        {cropMode && (
          <div className="mobile-crop-ratio">
            <label>
              裁剪比例
              <select
                aria-label="移动端裁剪比例"
                value={S.cropRatio}
                onChange={(e) => {
                  const ratio = Number(e.target.value);
                  setUI({
                    cropRatio: ratio,
                    cropDraft: {
                      crop: ratio
                        ? E.cropFor(photo.width, photo.height, {
                            cropAspect: ratio,
                          })
                        : S.cropDraft.crop,
                      cropAspect: ratio,
                    },
                  });
                }}
              >
                {[
                  [0, "自由"],
                  [1, "1:1"],
                  [4 / 3, "4:3"],
                  [3 / 4, "3:4"],
                  [1.5, "3:2"],
                  [0.8, "4:5"],
                  [16 / 9, "16:9"],
                  [9 / 16, "9:16"],
                ].map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {error && (
          <div className="preview-error" role="alert">
            {error}
          </div>
        )}
        <div
          ref={wrap}
          className={"canvas-wrap " + (cropMode ? "cropping" : "")}
          style={view ? { width: view.width, height: view.height } : undefined}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onLostPointerCapture={up}
        >
          <canvas
            id="preview-canvas"
            ref={canvas}
            aria-label="图片与水印预览"
            style={
              view ? { width: view.width, height: view.height } : undefined
            }
          />
          {!original && !cropMode && g && (
            <div
              data-selection
              className="selection"
              style={{
                left: g.x * view.ratio,
                top: g.y * view.ratio,
                width: Math.max(14, g.w * view.ratio),
                height: Math.max(14, g.h * view.ratio),
                transform: "translate(-50%,-50%) rotate(" + g.angle + "rad)",
              }}
            >
              <span className="selection-corner tl" />
              <span className="selection-corner tr" />
              <span className="selection-corner bl" />
              <span
                data-handle="resize"
                className="selection-handle resize"
                title="拖动缩放"
              >
                <MoveDiagonal2 size={12} />
              </span>
              <span
                data-handle="rotate"
                className="selection-handle rotate"
                title="拖动旋转，按 Shift 吸附角度"
              >
                <RotateCw size={13} />
              </span>
            </div>
          )}
          {cropMode && view && (
            <div
              className="crop-box"
              data-crop-body
              role="group"
              aria-label="裁剪选框"
              tabIndex={0}
              onKeyDown={(e) => {
                if (
                  !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
                    e.key,
                  )
                )
                  return;
                e.preventDefault();
                e.stopPropagation();
                const step = e.shiftKey ? 0.02 : 0.002;
                updateCrop(
                  moveCrop(
                    crop,
                    e.key === "ArrowLeft"
                      ? -step
                      : e.key === "ArrowRight"
                        ? step
                        : 0,
                    e.key === "ArrowUp"
                      ? -step
                      : e.key === "ArrowDown"
                        ? step
                        : 0,
                  ),
                );
              }}
              style={{
                left: crop.x * view.width,
                top: crop.y * view.height,
                width: crop.w * view.width,
                height: crop.h * view.height,
              }}
            >
              <i />
              <i />
              <i />
              <i />
              {["nw", "ne", "sw", "se"].map((corner, index) => (
                <span
                  key={corner}
                  data-crop-handle={corner}
                  className={"crop-handle " + corner}
                  title={["左上角", "右上角", "左下角", "右下角"][index]}
                />
              ))}
              <span className="crop-size">
                {Math.round(crop.w * photo.width)} ×{" "}
                {Math.round(crop.h * photo.height)}
              </span>
            </div>
          )}
          {guide.x != null && (
            <div className="guide vertical" style={{ left: guide.x }} />
          )}
          {guide.y != null && (
            <div className="guide horizontal" style={{ top: guide.y }} />
          )}
        </div>
      </div>
      <div className="preview-status">
        <span>
          {original ? "原图" : cropMode ? "裁剪中" : "预览"}
          <HelpTip
            label="画布操作提示"
            text={
              cropMode
                ? "拖动选框移动，拉四角缩放；框外拖动重新框选。Enter 应用，Esc 取消。"
                : "拖动水印移动，右下手柄缩放，上方手柄旋转；按住 Shift 旋转可吸附角度。"
            }
          />
        </span>
        <span>
          {view?.width
            ? dimensions.width + " × " + dimensions.height + " px"
            : ""}
        </span>
        <Button
          icon={zoom ? Scan : ZoomIn}
          onClick={() => setUI({ zoom: !zoom })}
        >
          {zoom ? "适应画布" : "放大查看"}
        </Button>
      </div>
    </>
  );
}
