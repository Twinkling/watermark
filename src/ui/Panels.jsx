import { HelpTip } from "./Tooltip.jsx";
import FontPicker from "./FontPicker.jsx";
import LayerList from "./LayerList.jsx";
import ImagePanel from "./ImagePanel.jsx";
import React from "react";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Type,
  ImagePlus,
  PenLine,
  Layers,
  SlidersHorizontal,
  Move,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  RotateCcw,
  RotateCw,
  Download,
  Upload,
  BookmarkPlus,
  Pin,
  Pencil,
  Search,
  Share2,
  Bold,
  Italic,
  Underline,
} from "lucide-react";
import {
  Button,
  IconButton,
  Section,
  Disclosure,
  Field,
  Slider,
  Select,
  NumberField,
  Check,
  Color,
  Segmented,
} from "./components.jsx";
import * as A from "./store.js";
const { S, E } = A;
export function WatermarkPanel({ choose }) {
  const d = A.doc(),
    l = A.selected(),
    asset = S.assets.get(l?.asset),
    ink = asset?.signature;
  const patch = A.patchLayer;
  return (
    <>
      <Section>
        <div className="watermark-toolbar">
          <div className="add-marks" role="group" aria-label="添加水印">
            <IconButton icon={Type} label="添加文字水印" onClick={A.addText} />
            <IconButton
              icon={ImagePlus}
              label="添加图片水印"
              onClick={() => choose("logo")}
            />
            <IconButton
              icon={PenLine}
              label="手写签名"
              onClick={() => A.openSignature()}
            />
          </div>
          <IconButton
            icon={BookmarkPlus}
            label="保存为模板"
            onClick={A.saveTemplate}
          />
        </div>
      </Section>
      {d.layers.some((a) => a.type === "logo" || a.text.trim()) && (
        <LayerList />
      )}
      {l && (
        <>
          <Section
            title={
              d.layers.length > 1 ? "编辑 · " + A.layerLabel(l) : undefined
            }
          >
            {l.type !== "logo" ? (
              <>
                <label className="field">
                  <span className="field-label">
                    水印文字
                    <HelpTip
                      label="文字输入提示"
                      text="支持换行，最多 500 个字符。"
                    />
                  </span>
                  <Textarea
                    aria-label="水印文字"
                    value={l.text}
                    maxLength={500}
                    placeholder="例如：© 我的原创作品"
                    rows={3}
                    onFocus={A.begin}
                    onChange={(e) => patch({ text: e.target.value }, true)}
                    onBlur={() => A.commit("编辑文字")}
                  />
                </label>
                <FontPicker layer={l} choose={choose} />
                <Color value={l.color} onChange={(color) => patch({ color })} />
              </>
            ) : (
              <>
                {!ink && (
                  <div className="asset-preview">
                    <img src={asset?.data} alt="图片水印预览" />
                  </div>
                )}
                <IconButton
                  icon={ink ? PenLine : ImagePlus}
                  label={ink ? "重新书写" : "添加另一张图片水印"}
                  onClick={() => (ink ? A.openSignature(true) : choose("logo"))}
                />
                {ink && (
                  <Color
                    label="签名颜色"
                    value={l.tint ? l.color : ink.color}
                    onChange={(color) => patch({ color, tint: true })}
                  />
                )}
              </>
            )}
            <Field label="排列方式">
              <Segmented
                label="排列方式"
                value={l.mode}
                options={[
                  ["single", "单个水印"],
                  ["tile", "满屏平铺"],
                ]}
                onChange={(mode) => patch({ mode })}
              />
            </Field>
            <Slider
              label="大小"
              value={l.size}
              min={1}
              max={l.type === "logo" ? 80 : 15}
              step={0.1}
              unit="%"
              onChange={(size, c) => patch({ size }, c)}
            />
            <Slider
              label="不透明度"
              value={l.opacity}
              min={1}
              max={100}
              unit="%"
              onChange={(opacity, c) => patch({ opacity }, c)}
            />
            {l.mode === "tile" && (
              <Slider
                label="水印间距"
                value={l.spacing}
                min={0.5}
                max={6}
                step={0.1}
                onChange={(spacing, c) => patch({ spacing }, c)}
              />
            )}
          </Section>
          <Disclosure title="位置与角度" icon={Move}>
            {l.mode === "single" && (
              <>
                <Field label="快速定位">
                  <div className="position-grid">
                    {[
                      "左上",
                      "上方",
                      "右上",
                      "左侧",
                      "居中",
                      "右侧",
                      "左下",
                      "下方",
                      "右下",
                    ].map((label, k) => {
                      const x = [0.15, 0.5, 0.85][k % 3],
                        y = [0.12, 0.5, 0.88][Math.floor(k / 3)];
                      return (
                        <button
                          key={label}
                          aria-label={"定位" + label}
                          aria-pressed={l.x === x && l.y === y}
                          className={l.x === x && l.y === y ? "selected" : ""}
                          onClick={() => patch({ x, y })}
                        >
                          <i />
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <div className="two-fields">
                  <NumberField
                    label="水平位置 %"
                    value={Math.round(l.x * 100)}
                    max={100}
                    onChange={(x, c) => patch({ x: x / 100 }, c)}
                  />
                  <NumberField
                    label="垂直位置 %"
                    value={Math.round(l.y * 100)}
                    max={100}
                    onChange={(y, c) => patch({ y: y / 100 }, c)}
                  />
                </div>
              </>
            )}
            <Slider
              label="旋转角度"
              value={l.angle}
              min={-180}
              max={180}
              unit="°"
              onChange={(angle, c) => patch({ angle }, c)}
            />
          </Disclosure>
          <Disclosure
            title={l.type === "logo" ? "图片样式" : "文字样式"}
            icon={SlidersHorizontal}
          >
            {l.type !== "logo" ? (
              <>
                <div
                  className="inline-actions text-style-actions"
                  role="group"
                  aria-label="文字格式"
                >
                  {[
                    ["bold", "粗体", Bold],
                    ["italic", "斜体", Italic],
                    ["underline", "下划线", Underline],
                  ].map(([k, label, Icon]) => (
                    <IconButton
                      key={k}
                      icon={Icon}
                      label={label}
                      aria-pressed={l[k]}
                      onClick={() => patch({ [k]: !l[k] })}
                    />
                  ))}
                </div>
                <Slider
                  label="行间距"
                  value={l.lineHeight}
                  min={1}
                  max={2.5}
                  step={0.1}
                  onChange={(lineHeight, c) => patch({ lineHeight }, c)}
                />
                <Slider
                  label="描边"
                  value={l.stroke}
                  max={10}
                  onChange={(stroke, c) => patch({ stroke }, c)}
                />
                {l.stroke > 0 && (
                  <Color
                    label="描边颜色"
                    value={l.strokeColor}
                    onChange={(strokeColor) => patch({ strokeColor })}
                  />
                )}
                <Check
                  label="文字底色"
                  checked={l.background}
                  onChange={(background) => patch({ background })}
                />
                {l.background && (
                  <Color
                    label="底色"
                    value={l.backgroundColor}
                    onChange={(backgroundColor) => patch({ backgroundColor })}
                  />
                )}
              </>
            ) : (
              <>
                <Check
                  label="统一颜色"
                  checked={l.tint}
                  onChange={(tint) => patch({ tint })}
                />
                {l.tint && (
                  <Color
                    value={l.color}
                    onChange={(color) => patch({ color })}
                  />
                )}
                <Slider
                  label="去除白底"
                  value={l.removeWhite}
                  max={100}
                  onChange={(removeWhite, c) => patch({ removeWhite }, c)}
                />
              </>
            )}
            <Slider
              label="阴影"
              value={l.shadow}
              max={20}
              onChange={(shadow, c) => patch({ shadow }, c)}
            />
          </Disclosure>
        </>
      )}
    </>
  );
}
export const EditPanel = ImagePanel;
const presets = [
  ["work", "原创作品", "© YOUR WORK", "角落署名"],
  ["identity", "证件保护", "仅供办理业务使用", "满屏平铺"],
  ["draft", "内部预览", "DRAFT", "草稿保护"],
  ["shop", "商品实拍", "ORIGINAL", "清晰防盗"],
  ["social", "社交分享", "MEMORIES", "留白边框"],
];
export function TemplatePanel({ choose }) {
  const templates = S.templates
    .filter((t) => t.name.toLowerCase().includes(S.search.toLowerCase()))
    .sort(
      (a, b) => Number(b.pinned) - Number(a.pinned) || b.savedAt - a.savedAt,
    );
  return (
    <>
      <Section title="预设">
        <div className="preset-grid">
          {presets.map(([key, name, text, note]) => (
            <button
              className={"preset-card preset-" + key}
              key={key}
              title={note}
              onClick={() => A.preset(key)}
            >
              <div>{text}</div>
              <strong>{name}</strong>
            </button>
          ))}
        </div>
      </Section>
      <Section
        title="我的模板"
        className="template-library"
        aside={
          <div className="section-actions" role="group" aria-label="模板操作">
            <IconButton
              icon={Upload}
              label="导入模板"
              onClick={() => choose("template")}
            />
            <IconButton
              icon={Download}
              label="导出当前模板"
              onClick={A.exportTemplate}
            />
            <IconButton
              icon={BookmarkPlus}
              label="保存当前模板"
              onClick={A.saveTemplate}
            />
          </div>
        }
      >
        {S.templates.length > 0 && (
          <label className="search-field">
            <Search size={15} />
            <Input
              aria-label="搜索模板"
              placeholder="搜索已保存的模板"
              value={S.search}
              onChange={(e) => A.setUI({ search: e.target.value })}
            />
          </label>
        )}
        {templates.length ? (
          templates.map((t) => (
            <div className="template-row" key={t.id}>
              <button
                className="template-name"
                onClick={() => A.loadTemplate(t)}
              >
                {t.pinned ? <Pin size={15} /> : <Layers size={15} />}
                <span>
                  {t.name}
                  <small>{t.doc.layers.length} 个水印</small>
                </span>
              </button>
              <div className="template-actions">
                {[
                  ["pin", Pin, "置顶模板"],
                  ["rename", Pencil, "重命名模板"],
                  ["copy", Copy, "复制模板"],
                  ["delete", Trash2, "删除模板"],
                ].map(([action, Icon, label]) => (
                  <IconButton
                    key={action}
                    icon={Icon}
                    label={label + " " + t.name}
                    onClick={() => A.templateAction(action, t)}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="empty-note">{S.search ? "未找到模板" : "暂无模板"}</p>
        )}
      </Section>
      <Disclosure
        title="编辑历史"
        icon={RotateCcw}
        badge={
          <HelpTip
            label="编辑历史说明"
            text="最多保留 40 步；添加或移除原图会清空历史。"
          />
        }
      >
        {S.undo.length ? (
          <ol className="history-list">
            {S.undo
              .slice(-8)
              .reverse()
              .map((h, k) => (
                <li key={k}>{h.label}</li>
              ))}
          </ol>
        ) : (
          <p className="hint">暂无编辑记录</p>
        )}
      </Disclosure>
    </>
  );
}
export function ExportPanel() {
  const o = S.output;
  return (
    <>
      <Section title="下载设置">
        <Field
          label="文件格式"
          hint="PNG 无损且保留透明；JPG 体积较小，透明处填白；WebP 支持透明并兼顾体积。"
        >
          <Segmented
            label="导出格式"
            value={o.format}
            options={[
              ["png", "PNG"],
              ["jpeg", "JPG"],
              ["webp", "WebP"],
            ]}
            onChange={(format) => A.changeOutput({ format })}
          />
        </Field>
        {o.format !== "png" && (
          <Slider
            label="画质"
            value={o.quality}
            min={30}
            max={100}
            unit="%"
            onChange={(quality, c) => A.changeOutput({ quality }, c)}
          />
        )}
        <label className="field">
          <span className="field-label">文件名后缀</span>
          <Input
            aria-label="文件名后缀"
            value={o.suffix}
            maxLength={40}
            onFocus={A.begin}
            onChange={(e) => A.changeOutput({ suffix: e.target.value }, true)}
            onBlur={() => A.commit()}
          />
        </label>
        <Button
          className="full-width"
          tone="primary"
          icon={Download}
          disabled={!S.items.length}
          tip="多张图片自动打包为 ZIP，原文件不会被覆盖"
          onClick={() => A.exportImages()}
        >
          下载{S.items.length > 1 ? "全部 " + S.items.length + " 张" : "图片"}
        </Button>
        {S.items.length > 1 && (
          <Button
            className="full-width"
            onClick={() => A.exportImages([A.item()])}
          >
            仅下载当前图片
          </Button>
        )}
      </Section>
      <Disclosure title="其他导出方式" icon={Download}>
        <Button
          className="full-width"
          disabled={!A.item()}
          onClick={() => A.exportImages([A.item()], { marks: true })}
        >
          下载透明水印 PNG
        </Button>
        <Button
          className="full-width"
          icon={Share2}
          disabled={!A.item()}
          onClick={() => A.exportImages([A.item()], { share: true })}
        >
          系统分享当前图片
        </Button>
      </Disclosure>
    </>
  );
}
