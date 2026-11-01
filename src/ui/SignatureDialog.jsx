import React, { useState, useRef, useLayoutEffect } from "react";
import {
  Undo2,
  Redo2,
  Trash2,
  Check,
  PenLine,
  ShieldCheck,
} from "lucide-react";
import { Modal, Button, IconButton, Color } from "./components.jsx";
import { Ink, applySignature, setUI } from "./store.js";
export default function SignatureDialog({ initial }) {
  const [scene, setScene] = useState(() => Ink.normalize(initial)),
    [past, setPast] = useState([]),
    [future, setFuture] = useState([]),
    [drawing, setDrawing] = useState(false);
  const canvas = useRef(),
    active = useRef(null),
    latest = useRef(scene),
    before = useRef(null),
    frame = useRef(null);
  latest.current = scene;
  useLayoutEffect(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const c = canvas.current;
      if (!c) return;
      const x = c.getContext("2d");
      x.clearRect(0, 0, c.width, c.height);
      x.save();
      x.scale(2, 2);
      Ink.draw(x, scene);
      x.restore();
    });
    return () => cancelAnimationFrame(frame.current);
  }, [scene]);
  const update = (s) => {
    latest.current = s;
    setScene(s);
  };
  const change = (values) => {
    const current = latest.current;
    setPast((p) => [...p, current].slice(-80));
    setFuture([]);
    update({ ...current, ...values });
  };
  const undo = (redo = false) => {
    const from = redo ? future : past;
    if (!from.length || active.current !== null) return;
    const next = from.at(-1),
      current = latest.current;
    if (redo) {
      setFuture(from.slice(0, -1));
      setPast((p) => [...p, current]);
    } else {
      setPast(from.slice(0, -1));
      setFuture((p) => [...p, current]);
    }
    update(next);
  };
  const point = (e) => {
    const r = canvas.current.getBoundingClientRect();
    return [
      Math.max(
        0,
        Math.min(Ink.WIDTH, ((e.clientX - r.left) / r.width) * Ink.WIDTH),
      ),
      Math.max(
        0,
        Math.min(Ink.HEIGHT, ((e.clientY - r.top) / r.height) * Ink.HEIGHT),
      ),
    ];
  };
  const down = (e) => {
    if (
      active.current !== null ||
      e.button !== 0 ||
      scene.strokes.length >= 256
    )
      return;
    e.preventDefault();
    active.current = e.pointerId;
    before.current = latest.current;
    canvas.current.setPointerCapture(e.pointerId);
    setDrawing(true);
    setFuture([]);
    update({
      ...latest.current,
      strokes: [...latest.current.strokes, [point(e)]],
    });
  };
  const move = (e) => {
    if (active.current !== e.pointerId) return;
    e.preventDefault();
    const samples = e.nativeEvent.getCoalescedEvents?.() || [e],
      strokes = latest.current.strokes.slice(),
      line = strokes.at(-1).slice();
    for (const sample of samples.length ? samples : [e]) {
      const p = point(sample),
        last = line.at(-1);
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.8) line.push(p);
    }
    if (strokes.reduce((n, s) => n + s.length, 0) > 19000) return;
    strokes[strokes.length - 1] = line;
    update({ ...latest.current, strokes });
  };
  const up = (e) => {
    if (active.current !== e.pointerId) return;
    active.current = null;
    setDrawing(false);
    const previous = before.current;
    setPast((p) => [...p, previous].slice(-80));
    if (canvas.current.hasPointerCapture(e.pointerId))
      canvas.current.releasePointerCapture(e.pointerId);
  };
  return (
    <Modal
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
          e.preventDefault();
          e.stopPropagation();
          undo(e.shiftKey);
        }
      }}
      title="手写签名"
      tip="使用鼠标、笔或手指书写。应用时自动裁去留白，保留透明背景；笔迹仅在本机处理。"
      className="signature-modal"
      onClose={() => setUI({ signature: null })}
      footer={
        <>
          <Button onClick={() => setUI({ signature: null })}>取消</Button>
          <Button
            tone="primary"
            icon={Check}
            disabled={!scene.strokes.length || drawing}
            onClick={() => applySignature(latest.current)}
          >
            应用签名
          </Button>
        </>
      }
    >
      <div>
        <div className="ink-toolbar">
          <div className="ink-widths" role="group" aria-label="笔画粗细">
            {[
              [3, "细"],
              [5, "适中"],
              [9, "粗"],
            ].map(([w, label]) => (
              <button
                key={w}
                aria-pressed={scene.width === w}
                className={scene.width === w ? "selected" : ""}
                onClick={() => change({ width: w })}
              >
                <i style={{ height: w / 2 + 1 }} />
                {label}
              </button>
            ))}
          </div>
          <div className="inline-actions">
            <IconButton
              icon={Undo2}
              label="撤销一笔"
              disabled={!past.length || drawing}
              onClick={() => undo()}
            />
            <IconButton
              icon={Redo2}
              label="重做一笔"
              disabled={!future.length || drawing}
              onClick={() => undo(true)}
            />
            <Button
              icon={Trash2}
              disabled={!scene.strokes.length || drawing}
              onClick={() => change({ strokes: [] })}
            >
              重写
            </Button>
          </div>
        </div>
        <div
          className={
            "signature-paper " +
            (scene.color.toLowerCase() === "#ffffff" ? "light-ink" : "")
          }
        >
          <canvas
            ref={canvas}
            id="signature-pad"
            width={Ink.WIDTH * 2}
            height={Ink.HEIGHT * 2}
            aria-label="手写签名画板"
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onLostPointerCapture={up}
          />
          {!scene.strokes.length && (
            <div className="signature-placeholder">
              <PenLine size={32} strokeWidth={1.2} />
              <span>在这里写下签名</span>
            </div>
          )}
        </div>
        <div className="signature-bottom">
          <Color
            label="笔迹颜色"
            value={scene.color}
            onChange={(color) => change({ color })}
          />
        </div>
      </div>
    </Modal>
  );
}
