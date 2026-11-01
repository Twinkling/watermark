import React, { useMemo, useState, useRef } from "react";
import { Input } from "../components/ui/input";
import { HelpTip } from "./Tooltip.jsx";
import {
  Crop,
  Palette,
  Scaling,
  Frame,
  Shield,
  RotateCcw,
  RotateCw,
  FlipHorizontal2,
  FlipVertical2,
  Sparkles,
  LockKeyhole,
  UnlockKeyhole,
  Check,
  X,
  Maximize,
} from "lucide-react";
import {
  IconButton,
  Section,
  Disclosure,
  Field,
  Slider,
  Select,
  NumberField,
  Color,
  Segmented,
} from "./components.jsx";
import * as A from "./store.js";
const { S, E } = A;
const ratios = [
  [0, "自由"],
  [1, "1:1"],
  [4 / 3, "4:3"],
  [3 / 4, "3:4"],
  [1.5, "3:2"],
  [0.8, "4:5"],
  [16 / 9, "16:9"],
  [9 / 16, "9:16"],
];
const filters = [
  ["none", "原色"],
  ["mono", "黑白"],
  ["sepia", "复古"],
  ["warm", "暖阳"],
  ["cool", "冷调"],
  ["vivid", "鲜明"],
  ["fade", "褪色"],
  ["dramatic", "戏剧"],
];
function FilterChoices({ photo, e }) {
  const thumbs = useMemo(() => {
    if (!photo) return {};
    const result = {};
    for (const [filter] of filters) {
      const c = document.createElement("canvas");
      try {
        E.render(c, photo.image, {
          layers: [],
          edit: {
            ...e,
            filter,
            strength: 100,
            resize: 120,
            resizeMode: "long",
            frame: "none",
            protect: "none",
          },
        });
        result[filter] = c.toDataURL();
      } catch {}
      c.width = c.height = 1;
    }
    return result;
  }, [photo, e]);
  return (
    <div className="filter-choices" role="group" aria-label="滤镜预览">
      {filters.map(([filter, name]) => (
        <button
          key={filter}
          className={e.filter === filter ? "active" : ""}
          aria-pressed={e.filter === filter}
          onClick={() => A.patchEdit({ filter })}
        >
          {thumbs[filter] ? (
            <img src={thumbs[filter]} alt="" />
          ) : (
            <span className="filter-placeholder" />
          )}
          <span>{name}</span>
        </button>
      ))}
    </div>
  );
}
export default function ImagePanel() {
  const d = A.doc(),
    e = d.edit,
    photo = A.item(),
    patch = A.patchEdit;
  const [locked, setLocked] = useState(true);
  const sizeRatio = useRef(e.width / e.height);
  const crop = S.cropMode
    ? S.cropDraft.crop
    : E.cropFor(photo?.width || 1, photo?.height || 1, e);
  const output = photo ? E.dimensions(photo.width, photo.height, d) : null;
  const resetCrop = () => {
    if (S.cropMode) {
      A.setUI({ cropRatio: 0 });
      A.updateCrop({ x: 0, y: 0, w: 1, h: 1 });
    } else patch({ cropAspect: 0, crop: { x: 0, y: 0, w: 1, h: 1 } });
  };
  const size = (key, value, continuous) => {
    const next = { [key]: value };
    if (locked)
      next[key === "width" ? "height" : "width"] = Math.max(
        1,
        Math.round(
          value * (key === "width" ? 1 / sizeRatio.current : sizeRatio.current),
        ),
      );
    patch(next, continuous);
  };
  return (
    <>
      <div className="image-tool-strip">
        <div className="image-tools" role="group" aria-label="修图工具">
          {[
            ["crop", "裁剪", Crop],
            ["color", "调色", Palette],
            ["size", "尺寸", Scaling],
            ["decor", "装饰", Frame],
          ].map(([key, label, Icon]) => (
            <IconButton
              key={key}
              icon={Icon}
              label={label}
              className={S.editTab === key ? "active" : ""}
              aria-pressed={S.editTab === key}
              onClick={() => A.setEditTab(key)}
            />
          ))}
        </div>
        <IconButton
          className="reset-edits"
          icon={RotateCcw}
          label="还原所有修图设置"
          onClick={() => {
            A.finishCrop(false);
            A.edit((d) => {
              d.edit = E.defaults().edit;
            }, "重置图片调整");
          }}
        />
      </div>
      {S.editTab === "crop" && (
        <>
          <Section
            title="裁剪与构图"
            aside={
              <div
                className="inline-actions"
                role="group"
                aria-label="裁剪操作"
              >
                {S.cropMode ? (
                  <>
                    <IconButton
                      icon={X}
                      label="取消裁剪"
                      onClick={() => A.finishCrop(false)}
                    />
                    <IconButton
                      tone="primary"
                      icon={Check}
                      label="应用裁剪"
                      onClick={() => A.finishCrop()}
                    />
                  </>
                ) : (
                  <IconButton
                    icon={Crop}
                    label="调整裁剪"
                    disabled={!photo}
                    onClick={A.startCrop}
                  />
                )}
                <IconButton
                  icon={Maximize}
                  label="恢复完整图片"
                  disabled={!photo}
                  onClick={resetCrop}
                />
              </div>
            }
          >
            <Field
              label="常用比例"
              hint="选择比例后，可拖动选框移动、拉动四角缩放，框外拖动重新框选。应用后保存，取消可放弃。"
            >
              <div className="ratio-choices" role="group" aria-label="裁剪比例">
                {ratios.map(([r, label]) => (
                  <button
                    key={r}
                    disabled={!photo}
                    className={
                      (S.cropMode ? S.cropRatio : e.cropAspect) === r
                        ? "active"
                        : ""
                    }
                    aria-pressed={
                      (S.cropMode ? S.cropRatio : e.cropAspect) === r
                    }
                    onClick={() => A.cropPreset(r)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
          </Section>
          <Section
            title="旋转与翻转"
            aside={
              S.cropMode && (
                <HelpTip
                  label="方向调整说明"
                  text="应用或取消当前裁剪后，可调整旋转、翻转和倾斜。"
                />
              )
            }
          >
            <div
              className="rotation-choices"
              role="group"
              aria-label="旋转与翻转"
            >
              {[
                [
                  RotateCcw,
                  "向左旋转 90°",
                  () => patch({ rotate: (e.rotate + 3) % 4 }),
                ],
                [
                  RotateCw,
                  "向右旋转 90°",
                  () => patch({ rotate: (e.rotate + 1) % 4 }),
                ],
                [
                  FlipHorizontal2,
                  "水平翻转",
                  () => patch({ flipX: !e.flipX }),
                  e.flipX,
                ],
                [
                  FlipVertical2,
                  "垂直翻转",
                  () => patch({ flipY: !e.flipY }),
                  e.flipY,
                ],
              ].map(([Icon, label, action, active]) => (
                <IconButton
                  key={label}
                  icon={Icon}
                  label={label}
                  disabled={S.cropMode}
                  aria-pressed={active}
                  onClick={action}
                />
              ))}
            </div>
            {!S.cropMode && (
              <Slider
                label="校正倾斜"
                value={e.straighten}
                min={-30}
                max={30}
                step={0.5}
                unit="°"
                onChange={(straighten, c) => patch({ straighten }, c)}
              />
            )}
          </Section>
          <Disclosure title="精确裁剪数值" icon={Crop}>
            <div className="two-fields">
              {[
                ["x", "左侧 %"],
                ["y", "顶部 %"],
                ["w", "宽度 %"],
                ["h", "高度 %"],
              ].map(([key, label]) => (
                <NumberField
                  key={key}
                  label={label}
                  min={key === "w" || key === "h" ? 1 : 0}
                  max={100}
                  step={0.1}
                  value={Number((crop[key] * 100).toFixed(1))}
                  onChange={(v) => {
                    if (!S.cropMode) A.startCrop();
                    if (!S.cropMode) return;
                    A.setUI({ cropRatio: 0 });
                    A.updateCrop(
                      E.normalize({
                        edit: { crop: { ...crop, [key]: v / 100 } },
                      }).edit.crop,
                    );
                  }}
                />
              ))}
            </div>
          </Disclosure>
        </>
      )}
      {S.editTab === "color" && (
        <>
          <Section
            title="滤镜"
            aside={
              <IconButton
                icon={RotateCcw}
                label="还原滤镜"
                onClick={() => patch({ filter: "none", strength: 100 })}
              />
            }
          >
            <FilterChoices photo={photo} e={e} />
            {e.filter !== "none" && (
              <Slider
                label="滤镜强度"
                value={e.strength}
                unit="%"
                onChange={(strength, c) => patch({ strength }, c)}
              />
            )}
          </Section>
          <Section
            title="基础调整"
            aside={
              <div className="inline-actions">
                <IconButton
                  icon={Sparkles}
                  label="自动调整亮度"
                  disabled={!photo}
                  onClick={A.autoColor}
                />
                <IconButton
                  icon={RotateCcw}
                  label="调色参数归零"
                  onClick={() =>
                    patch({
                      brightness: 0,
                      contrast: 0,
                      saturation: 0,
                      warmth: 0,
                      tint: 0,
                    })
                  }
                />
              </div>
            }
          >
            {[
              ["brightness", "亮度"],
              ["contrast", "对比度"],
              ["saturation", "饱和度"],
            ].map(([key, label]) => (
              <Slider
                key={key}
                label={label}
                value={e[key]}
                min={-100}
                max={100}
                onChange={(v, c) => patch({ [key]: v }, c)}
              />
            ))}
          </Section>
          <Disclosure title="色温与色调" icon={Palette}>
            {[
              ["warmth", "色温"],
              ["tint", "色调"],
            ].map(([key, label]) => (
              <Slider
                key={key}
                label={label}
                value={e[key]}
                min={-100}
                max={100}
                onChange={(v, c) => patch({ [key]: v }, c)}
              />
            ))}
          </Disclosure>
        </>
      )}
      {S.editTab === "size" && (
        <>
          <Section title="常用尺寸">
            <div className="size-choices">
              {[
                ["原始尺寸", "保持当前裁剪", { resizeMode: "long", resize: 0 }],
                [
                  "长边 2048",
                  "适合保存与分享",
                  { resizeMode: "long", resize: 2048 },
                ],
                [
                  "方形 1080",
                  "1080 × 1080",
                  { resizeMode: "cover", width: 1080, height: 1080 },
                ],
                [
                  "竖版 4:5",
                  "1080 × 1350",
                  { resizeMode: "cover", width: 1080, height: 1350 },
                ],
                [
                  "竖屏 9:16",
                  "1080 × 1920",
                  { resizeMode: "cover", width: 1080, height: 1920 },
                ],
                [
                  "横版 16:9",
                  "1280 × 720",
                  { resizeMode: "cover", width: 1280, height: 720 },
                ],
              ].map(([label, note, values]) => (
                <button
                  key={label}
                  className={
                    Object.entries(values).every(([k, v]) => e[k] === v)
                      ? "active"
                      : ""
                  }
                  aria-pressed={Object.entries(values).every(
                    ([k, v]) => e[k] === v,
                  )}
                  onClick={() => patch(values)}
                >
                  <strong>{label}</strong>
                  <small>{note}</small>
                </button>
              ))}
            </div>
          </Section>
          <Section title="自定义尺寸">
            <Field label="调整方式">
              <Segmented
                label="调整尺寸方式"
                value={e.resizeMode === "long" ? "long" : "canvas"}
                options={[
                  ["long", "按长边缩小"],
                  ["canvas", "指定宽高"],
                ]}
                onChange={(mode) => {
                  const native = photo
                    ? E.dimensions(photo.width, photo.height, {
                        layers: [],
                        edit: {
                          ...e,
                          frame: "none",
                          resizeMode: "long",
                          resize: 0,
                        },
                      })
                    : { width: 1200, height: 800 };
                  patch(
                    mode === "long"
                      ? { resizeMode: "long" }
                      : {
                          resizeMode: "contain",
                          width: native.width,
                          height: native.height,
                        },
                  );
                }}
              />
            </Field>
            {e.resizeMode === "long" ? (
              <NumberField
                label="长边 px · 0 保持原尺寸"
                value={e.resize}
                onChange={(resize, c) => patch({ resize }, c)}
              />
            ) : (
              <>
                <div className="two-fields">
                  <NumberField
                    onStart={() => (sizeRatio.current = e.width / e.height)}
                    label="宽度 px"
                    value={e.width}
                    min={1}
                    onChange={(v, c) => size("width", v, c)}
                  />
                  <NumberField
                    onStart={() => (sizeRatio.current = e.width / e.height)}
                    label="高度 px"
                    value={e.height}
                    min={1}
                    onChange={(v, c) => size("height", v, c)}
                  />
                </div>
                <IconButton
                  className="lock-ratio"
                  icon={locked ? LockKeyhole : UnlockKeyhole}
                  label={
                    locked
                      ? "宽高比例已锁定，点击解锁"
                      : "自由设置宽高，点击锁定比例"
                  }
                  aria-pressed={locked}
                  onClick={() => setLocked(!locked)}
                />
                <Select
                  label="图片如何适应画布"
                  value={e.resizeMode}
                  options={[
                    ["contain", "完整放入 · 保留留白"],
                    ["cover", "铺满画布 · 裁掉多余"],
                    ["stretch", "拉伸到指定宽高"],
                  ]}
                  onChange={(resizeMode) => patch({ resizeMode })}
                />
              </>
            )}
            {output && (
              <div className="output-dimensions">
                <span>
                  导出尺寸{" "}
                  <HelpTip
                    label="导出尺寸说明"
                    text="最终尺寸包含裁剪、缩放和边框。"
                  />
                </span>
                <strong>
                  {output.width} × {output.height}
                  <small> px</small>
                </strong>
              </div>
            )}
          </Section>
        </>
      )}
      {S.editTab === "decor" && <DecorationPanel e={e} patch={patch} />}
    </>
  );
}
function DecorationPanel({ e, patch }) {
  return (
    <>
      <Section title="边框">
        <Select
          label="边框样式"
          value={e.frame}
          options={[
            ["none", "无边框"],
            ["border", "简洁留白"],
            ["gallery", "画廊"],
            ["instant", "拍立得"],
            ["rounded", "圆角"],
            ["film", "胶片"],
            ["shadow", "悬浮阴影"],
          ]}
          onChange={(frame) => patch({ frame })}
        />
        {e.frame !== "none" && (
          <>
            <Slider
              label="边框大小"
              value={e.frameSize}
              min={1}
              max={15}
              unit="%"
              onChange={(frameSize, c) => patch({ frameSize }, c)}
            />
            <Color
              label="边框颜色"
              value={e.frameColor}
              onChange={(frameColor) => patch({ frameColor })}
            />
            {e.frame === "instant" && (
              <label className="field">
                <span className="field-label">边框文字</span>
                <Input
                  value={e.caption}
                  maxLength={100}
                  onFocus={A.begin}
                  onChange={(v) => patch({ caption: v.target.value }, true)}
                  onBlur={() => A.commit()}
                />
              </label>
            )}
          </>
        )}
      </Section>
      <Disclosure title="防盗纹理" icon={Shield}>
        <Select
          label="纹理"
          value={e.protect}
          options={[
            ["none", "不添加"],
            ["lines", "斜线"],
            ["hatch", "交叉斜线"],
            ["grid", "网格"],
            ["dots", "圆点"],
            ["crosses", "十字"],
            ["waves", "波浪"],
            ["zigzag", "折线"],
            ["rings", "同心圆"],
            ["rays", "放射线"],
            ["honeycomb", "六边形"],
          ]}
          onChange={(protect) => patch({ protect })}
        />
        {e.protect !== "none" && (
          <>
            <Color
              label="纹理颜色"
              value={e.protectColor}
              onChange={(protectColor) => patch({ protectColor })}
            />
            <Slider
              label="纹理不透明度"
              value={e.protectOpacity}
              min={1}
              max={70}
              unit="%"
              onChange={(protectOpacity, c) => patch({ protectOpacity }, c)}
            />
            <Slider
              label="纹理间距"
              value={e.protectSpacing}
              min={2}
              max={20}
              onChange={(protectSpacing, c) => patch({ protectSpacing }, c)}
            />
          </>
        )}
      </Disclosure>
    </>
  );
}
