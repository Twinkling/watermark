import React, { useEffect, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Modal, Button, Select, Segmented } from "./components.jsx";
import Tooltip from "./Tooltip.jsx";
import { artFonts, systemFonts, ensureArtFont } from "./fonts.js";
import * as A from "./store.js";

function FontDialog({ layer, choose, onClose }) {
  const [loaded, setLoaded] = useState({});
  const [group, setGroup] = useState(
    artFonts.find((font) => font.id === layer.font)?.category.startsWith("英文")
      ? "英文"
      : "中文",
  );
  const visible = artFonts.filter(
    (font) => group === "全部" || font.category.startsWith(group),
  );
  useEffect(() => {
    let active = true;
    for (const font of visible)
      ensureArtFont(font.id)
        .then(() => {
          if (active) setLoaded((v) => ({ ...v, [font.id]: true }));
        })
        .catch(() => {
          if (active) setLoaded((v) => ({ ...v, [font.id]: false }));
        });
    return () => {
      active = false;
    };
  }, [group]);
  const pick = async (id) => {
    if (await A.selectFont(id)) onClose();
  };
  return (
    <Modal
      title="选择字体"
      tip={`${artFonts.length} 款免费商用字体，在线版按需加载，离线版全部内置。英文款不含中文字形。来源与完整授权在下方查看。`}
      onClose={onClose}
      className="font-dialog"
    >
      <div className="font-filter">
        <Segmented
          label="字体分类"
          value={group}
          options={[
            ["中文", "中文"],
            ["英文", "英文"],
            ["全部", "全部"],
          ]}
          onChange={setGroup}
        />
      </div>
      <div className="art-font-grid">
        {visible.map((font) => (
          <Tooltip
            key={font.id}
            text={
              font.category +
              (font.id === "art_lxgwwenkaitc"
                ? " · TC 字形，支持简繁中文"
                : "") +
              (font.category.startsWith("英文")
                ? " · 中文使用系统字体回退"
                : "") +
              " · 免费商用 · 本地渲染"
            }
          >
            <button
              key={font.id}
              className={
                "art-font-card " + (layer.font === font.id ? "selected" : "")
              }
              disabled={A.S.busy}
              aria-pressed={layer.font === font.id}
              aria-label={"选择字体 " + font.name}
              onClick={() => pick(font.id)}
            >
              <span
                className="art-font-sample"
                style={{
                  fontFamily: loaded[font.id] ? `"${font.id}"` : "inherit",
                }}
              >
                {loaded[font.id]
                  ? font.sample
                  : loaded[font.id] === false
                    ? "点击重试加载"
                    : "正在加载字体…"}
              </span>
              <span className="art-font-meta">
                <span>{font.name}</span>
                {layer.font === font.id && <Check size={16} />}
              </span>
            </button>
          </Tooltip>
        ))}
      </div>
      <Select
        label="系统与导入字体"
        value={layer.font.startsWith("art_") ? "" : layer.font}
        options={[
          ["", "选择其他字体"],
          ...systemFonts,
          ...[...A.S.fonts].map(([id, f]) => [id, f.name]),
        ]}
        onChange={(id) => id && pick(id)}
      />
      <Button
        onClick={() => {
          onClose();
          choose("font");
        }}
      >
        导入本地字体
      </Button>
      <details className="font-licenses">
        <summary>字体来源与商用授权</summary>
        <p>
          这 {artFonts.length} 款内置字体采用 SIL Open Font License
          1.1，允许商用图片创作、嵌入和随软件分发。使用字体制作的图片不受该字体许可证约束。字体文件本身不得单独售卖，重新分发时须保留版权与许可证。系统字体及自行导入字体以各自授权为准。
        </p>
        {artFonts.map((font) => (
          <details key={font.id}>
            <summary>{font.name} · SIL OFL 1.1</summary>
            <a href={font.licenseUrl} target="_blank" rel="noreferrer">
              查看原始授权文件
            </a>
            <pre>{font.licenseText}</pre>
          </details>
        ))}
      </details>
    </Modal>
  );
}

export default function FontPicker({ layer, choose }) {
  const [open, setOpen] = useState(false);
  const builtIn = artFonts.find((font) => font.id === layer.font);
  const label =
    builtIn?.name ||
    A.S.fonts.get(layer.font)?.name ||
    systemFonts.find(([id]) => id === layer.font)?.[1] ||
    "现代黑体";
  return (
    <>
      <div className="field font-picker">
        <span className="field-label">字体</span>
        <button
          className="font-picker-trigger"
          aria-label={"选择字体，当前" + label}
          onClick={() => setOpen(true)}
        >
          <span>{label}</span>
          <ChevronDown size={15} />
        </button>
      </div>
      {open && (
        <FontDialog
          layer={layer}
          choose={choose}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
