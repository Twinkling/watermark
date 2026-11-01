import React from "react";
import {
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Type,
  PenLine,
} from "lucide-react";
import { IconButton, Section } from "./components.jsx";
import * as A from "./store.js";

export default function LayerList() {
  const layers = A.doc().layers,
    chosen = A.selected()?.id;
  return (
    <Section
      className="layer-manager"
      title="我的水印"
      aside={<span className="hint">{layers.length} / 12</span>}
    >
      <div className="layer-cards" aria-label="水印列表">
        {[...layers].reverse().map((l, index) => {
          const asset = A.S.assets.get(l.asset),
            name = A.layerLabel(l),
            active = l.id === chosen;
          return (
            <div
              key={l.id}
              data-layer-id={l.id}
              className={`layer-card ${active ? "active" : ""} ${!l.visible ? "is-hidden" : ""}`}
            >
              <button
                className="layer-pick"
                aria-pressed={active}
                title={name}
                aria-label={"编辑水印 " + name}
                onClick={() => A.selectLayer(l.id)}
              >
                <span className="layer-thumbnail">
                  {asset ? (
                    <img src={asset.data} alt="" draggable="false" />
                  ) : l.type === "signature" ? (
                    <PenLine size={16} />
                  ) : (
                    <Type size={16} />
                  )}
                </span>
                <span className="layer-description">
                  <strong>{name}</strong>
                </span>
              </button>
              <div className="layer-row-actions">
                <IconButton
                  icon={ArrowUp}
                  label={"上移 " + name}
                  disabled={index === 0}
                  onClick={() => A.layerAction("front", l.id)}
                />
                <IconButton
                  icon={ArrowDown}
                  label={"下移 " + name}
                  disabled={index === layers.length - 1}
                  onClick={() => A.layerAction("back", l.id)}
                />
                <IconButton
                  icon={l.visible ? Eye : EyeOff}
                  label={(l.visible ? "隐藏 " : "显示 ") + name}
                  onClick={() => A.layerAction("visibility", l.id)}
                />
                <IconButton
                  icon={Copy}
                  label={"复制 " + name}
                  disabled={layers.length >= 12}
                  onClick={() => A.layerAction("duplicate", l.id)}
                />
                <IconButton
                  icon={Trash2}
                  label={"删除 " + name}
                  onClick={() => A.layerAction("delete", l.id)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
