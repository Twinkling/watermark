import { Input } from "../components/ui/input";
import { HelpTip } from "./Tooltip.jsx";
import React, {
  useSyncExternalStore,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ScanLine,
  ShieldCheck,
  Undo2,
  Redo2,
  Download,
  ChevronDown,
  Plus,
  FolderPlus,
  ImagePlus,
  Type,
  SlidersHorizontal,
  LayoutGrid,
  Sun,
  Moon,
  HelpCircle,
  Check,
  Eye,
  ArrowRight,
  X,
  Trash2,
  PenLine,
  LockKeyhole,
} from "lucide-react";
import * as A from "./store.js";
import { Button, IconButton, Modal, Segmented } from "./components.jsx";
import {
  WatermarkPanel,
  EditPanel,
  TemplatePanel,
  ExportPanel,
} from "./Panels.jsx";
import Preview from "./Preview.jsx";
import SignatureDialog from "./SignatureDialog.jsx";
const { S } = A;
const nav = [
  ["watermark", "水印", Type],
  ["image", "修图", SlidersHorizontal],
  ["templates", "模板", LayoutGrid],
];
function ConfirmDialog({ dialog }) {
  const [value, setValue] = useState(dialog.value);
  return (
    <Modal
      title={dialog.title}
      onClose={() => A.closeDialog()}
      footer={
        <>
          <Button onClick={() => A.closeDialog()}>取消</Button>
          <Button
            tone="primary"
            disabled={dialog.input && !value.trim()}
            onClick={() => A.closeDialog(dialog.input ? value : true)}
          >
            {dialog.confirm}
          </Button>
        </>
      }
    >
      <p className="dialog-text">{dialog.text}</p>
      {dialog.input && (
        <Input
          autoFocus
          aria-label={dialog.title}
          maxLength={80}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) A.closeDialog(value);
          }}
        />
      )}
    </Modal>
  );
}
function Help({ close }) {
  return (
    <Modal
      title="让每张照片，都有你的印记"
      onClose={close}
      footer={
        <Button tone="primary" onClick={close}>
          知道了
        </Button>
      }
    >
      <div className="help-content">
        <p>添加图片 → 选择水印或手写签名 → 下载。所有处理在你的设备上完成。</p>
        <ul>
          <li>在照片上拖动水印，右下角可缩放，上方手柄可旋转。</li>
          <li>多张图片默认使用同一套设置，也能单独调整当前图片。</li>
          <li>
            ⌘ / Ctrl + Z 撤销，Shift + ⌘ / Ctrl + Z 重做；方向键微调位置，按住
            Shift 加快。
          </li>
          <li>
            可拖入文件或粘贴剪贴板图片。支持 HEIC /
            HEIF、JPG、PNG、WebP、AVIF、TIFF、BMP、GIF、APNG、ICO 和安全 SVG。
          </li>
          <li>
            动画和多页文件取静态首帧；SVG 转为位图。导出支持 PNG、JPG、WebP。
          </li>
        </ul>
      </div>
    </Modal>
  );
}
export default function App() {
  useSyncExternalStore(A.subscribe, A.snapshot);
  const panelScroll = useRef();
  const inputs = useRef({}),
    [dragging, setDragging] = useState(false),
    [help, setHelp] = useState(false);
  const photo = A.item(),
    document = photo ? A.effective(photo) : A.doc(),
    selected = A.selected();
  const choose = (type) => inputs.current[type]?.click();
  useEffect(() => {
    if (panelScroll.current) panelScroll.current.scrollTop = 0;
  }, [S.tool, S.editTab]);
  useEffect(() => {
    const typing = (t) =>
      t?.closest?.(
        'input,textarea,select,[contenteditable=true],[role="slider"],[role="combobox"]',
      );
    const blocked = () =>
      S.busy ||
      S.dialog ||
      S.signature ||
      window.document.querySelector(
        '[data-modal="true"],[role="listbox"],[data-help-popover="true"]',
      );
    const key = (e) => {
      if (blocked() || typing(e.target)) return;
      if (S.cropMode) {
        if (e.key === "Escape") {
          e.preventDefault();
          A.finishCrop(false);
        } else if (e.key === "Enter") {
          e.preventDefault();
          A.finishCrop();
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        A.undo(e.shiftKey);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        A.layerAction("duplicate");
        return;
      }
      if (["Delete", "Backspace"].includes(e.key)) {
        e.preventDefault();
        A.layerAction("delete");
        return;
      }
      if (e.key === "Escape") {
        A.setUI({ cropMode: false, panelOpen: false, original: false });
        return;
      }
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) &&
        A.selected()?.mode === "single" &&
        A.item()
      ) {
        e.preventDefault();
        if (A.item().doc && S.scope === "all") A.changeScope("current");
        const l = A.selected(),
          step = e.shiftKey ? 0.02 : 0.002;
        A.patchLayer({
          x:
            l.x +
            (["ArrowLeft", "ArrowRight"].includes(e.key)
              ? e.key === "ArrowLeft"
                ? -step
                : step
              : 0),
          y:
            l.y +
            (["ArrowUp", "ArrowDown"].includes(e.key)
              ? e.key === "ArrowUp"
                ? -step
                : step
              : 0),
        });
      }
    };
    const paste = (e) => {
      if (blocked() || typing(e.target)) return;
      const files = [...(e.clipboardData?.files || [])];
      if (files.length) {
        e.preventDefault();
        A.importFiles(files);
      }
    };
    const over = (e) => {
      if (e.dataTransfer?.types.includes("Files")) {
        e.preventDefault();
        if (!blocked()) setDragging(true);
      }
    };
    const leave = (e) => {
      if (!e.relatedTarget) setDragging(false);
    };
    const drop = (e) => {
      e.preventDefault();
      setDragging(false);
      if (!blocked() && e.dataTransfer?.files.length)
        A.importFiles(e.dataTransfer.files);
    };
    window.addEventListener("keydown", key);
    window.addEventListener("paste", paste);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("paste", paste);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, []);
  return (
    <div
      className={
        "app " + (S.dark ? "dark " : "") + (S.panelOpen ? "panel-open" : "")
      }
    >
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">
            <ScanLine size={23} strokeWidth={1.6} />
          </span>
          <span>
            留印<small>WATERMARK STUDIO</small>
          </span>
        </div>
        <div className="header-actions">
          <div className="history-actions">
            <IconButton
              icon={Undo2}
              label="撤销"
              disabled={!S.undo.length || S.busy || S.cropMode}
              onClick={() => A.undo()}
            />
            <IconButton
              icon={Redo2}
              label="重做"
              disabled={!S.redo.length || S.busy || S.cropMode}
              onClick={() => A.undo(true)}
            />
          </div>
          <IconButton
            icon={S.dark ? Sun : Moon}
            label={S.dark ? "浅色模式" : "深色模式"}
            onClick={() => A.setUI({ dark: !S.dark })}
          />
          <IconButton
            icon={HelpCircle}
            label="使用帮助"
            onClick={() => setHelp(true)}
          />
          <div className="download-group">
            <Button
              tone="primary"
              icon={Download}
              disabled={!S.items.length || S.busy || S.cropMode}
              onClick={() => A.exportImages()}
            >
              <span>
                下载{S.items.length > 1 ? " " + S.items.length + " 张" : ""}
              </span>
            </Button>
            <IconButton
              tone="primary"
              icon={ChevronDown}
              label="下载设置"
              disabled={S.busy}
              onClick={() => A.openTool("export")}
            />
          </div>
        </div>
      </header>
      <main className="workspace">
        <aside className="inspector" aria-label="编辑面板">
          <nav className="tool-tabs" aria-label="编辑工具">
            {nav.map(([key, label, Icon]) => (
              <button
                key={key}
                aria-current={S.tool === key ? "page" : undefined}
                className={S.tool === key ? "active" : ""}
                onClick={() => A.openTool(key)}
                disabled={S.busy}
              >
                <Icon size={17} strokeWidth={1.7} />
                {label}
              </button>
            ))}
          </nav>
          <div className="mobile-panel-heading">
            <strong>
              {S.tool === "export"
                ? "下载设置"
                : nav.find((a) => a[0] === S.tool)?.[1]}
            </strong>
            <Button icon={Check} onClick={() => A.setUI({ panelOpen: false })}>
              完成
            </Button>
          </div>
          {(S.items.length > 1 || photo?.doc) && (
            <div className="scope-control">
              <span>应用范围</span>
              <Segmented
                label="设置应用范围"
                value={S.scope}
                options={[
                  ["all", "整批图片"],
                  ["current", "仅当前"],
                ]}
                onChange={A.changeScope}
              />
              {photo?.doc && (
                <button
                  className="text-button"
                  title="当前图片已有独立设置，点击后重新跟随整批"
                  onClick={A.restoreBatch}
                >
                  恢复整批设置
                </button>
              )}
            </div>
          )}
          <fieldset
            ref={panelScroll}
            className="panel-scroll"
            disabled={S.busy}
          >
            {S.tool === "watermark" ? (
              <WatermarkPanel choose={choose} />
            ) : S.tool === "image" ? (
              <EditPanel />
            ) : S.tool === "templates" ? (
              <TemplatePanel choose={choose} />
            ) : (
              <ExportPanel />
            )}
          </fieldset>
          <div className="inspector-footer">
            <HelpTip
              label="隐私说明"
              text="图片只在本机处理，不上传。刷新会清空当前图片；手动保存的模板会留在此浏览器。"
            />
            <span>离线模式</span>
            <span>v3.4</span>
          </div>
        </aside>
        <section className="editor" aria-label="图片工作区">
          <div className="editor-toolbar">
            <div className="inline-actions">
              <Button
                icon={Plus}
                disabled={S.busy}
                onClick={() => choose("files")}
              >
                添加图片
              </Button>
              <IconButton
                icon={FolderPlus}
                label="添加文件夹"
                disabled={S.busy}
                onClick={() => choose("folder")}
              />
              <span className="photo-count">
                {S.items.length ? S.items.length + " 张图片" : "开始你的创作"}
              </span>
            </div>
            {photo && (
              <div className="inline-actions">
                <span className="active-filename" title={photo.name}>
                  {photo.name}
                </span>
                {S.cropMode ? (
                  <>
                    <Button onClick={() => A.finishCrop(false)}>
                      取消裁剪
                    </Button>
                    <Button
                      tone="primary"
                      icon={Check}
                      onClick={() => A.finishCrop()}
                    >
                      应用裁剪
                    </Button>
                  </>
                ) : (
                  <Button
                    icon={Eye}
                    className={S.original ? "selected" : ""}
                    disabled={S.busy}
                    aria-pressed={S.original}
                    onClick={() => A.setUI({ original: !S.original })}
                  >
                    {S.original ? "返回效果" : "对比原图"}
                  </Button>
                )}
              </div>
            )}
          </div>
          {photo ? (
            <>
              <Preview
                photo={photo}
                document={document}
                original={S.original}
                zoom={S.zoom}
                cropMode={S.cropMode}
                selectedId={selected?.id}
              />
              <div className="photo-tray">
                <div className="tray-list">
                  {S.items.map((i, k) => (
                    <div
                      key={i.id}
                      className={
                        "photo-tile " + (i.id === S.active ? "active" : "")
                      }
                    >
                      <button
                        className="photo-select"
                        aria-label={"选择图片 " + i.name}
                        aria-pressed={i.id === S.active}
                        disabled={S.busy}
                        onClick={() => A.selectPhoto(i.id)}
                      >
                        <img src={i.thumbnail} alt="" />
                        <span>{k + 1}</span>
                        {i.doc && <i title="单独调整" />}
                      </button>
                      <button
                        className="remove-photo"
                        aria-label={"移除图片 " + i.name}
                        disabled={S.busy}
                        onClick={() => A.removePhoto(i.id)}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    className="tray-add"
                    aria-label="继续添加图片"
                    disabled={S.busy}
                    onClick={() => choose("files")}
                  >
                    <Plus size={21} />
                  </button>
                </div>
                <IconButton
                  icon={Trash2}
                  label="清空图片"
                  disabled={S.busy}
                  onClick={A.clearPhotos}
                />
              </div>
            </>
          ) : (
            <div className="empty-stage">
              <div className="empty-art" aria-hidden="true">
                <div className="art-card back" />
                <div className="art-card front">
                  <ImagePlus size={44} strokeWidth={1} />
                  <span>made by you.</span>
                </div>
                <span className="art-pen">
                  <PenLine size={24} strokeWidth={1.5} />
                </span>
              </div>
              <h1>添加图片，开始编辑</h1>
              <Button
                tone="primary"
                icon={Plus}
                disabled={S.busy}
                onClick={() => choose("files")}
              >
                选择图片
              </Button>
              <Button tone="quiet" onClick={A.demo}>
                试用示例 <ArrowRight size={14} />
              </Button>
              <div className="import-formats">
                <p>
                  支持 JPG / JPEG、PNG、HEIC /
                  HEIF、WebP、AVIF、TIFF、BMP、GIF、APNG、ICO、SVG
                </p>
                <HelpTip
                  label="导入图片说明"
                  text="可拖入或粘贴图片。单批最多 40 张，单文件最多 50 MB；动画和多页图片取静态帧，SVG 转为位图。"
                />
              </div>
            </div>
          )}
          {S.messages.length > 0 && (
            <details className="import-messages">
              <summary>{S.messages.length} 条导入提示</summary>
              <ul>
                {S.messages.map((m, k) => (
                  <li key={k}>{m}</li>
                ))}
              </ul>
              <Button onClick={() => A.setUI({ messages: [] })}>
                收起提示
              </Button>
            </details>
          )}
        </section>
      </main>
      {S.busy && (
        <div className="progress-panel" role="status">
          <div>
            <strong>{S.progress?.text || "正在处理…"}</strong>
            <progress
              value={S.progress?.value || 0}
              max={S.progress?.max || 1}
            />
          </div>
          <Button disabled={S.cancel} onClick={() => A.setUI({ cancel: true })}>
            {S.cancel ? "正在停止…" : "取消"}
          </Button>
        </div>
      )}
      {S.toast && (
        <div
          className={"toast " + (S.toast.error ? "error" : "")}
          role={S.toast.error ? "alert" : "status"}
        >
          <span>{S.toast.text}</span>
          <IconButton
            icon={X}
            label="关闭提示"
            onClick={() => A.setUI({ toast: null })}
          />
        </div>
      )}
      {dragging && (
        <div className="drop-overlay">
          <ImagePlus size={42} />
          <strong>松开，添加到工作台</strong>
        </div>
      )}
      {S.signature && <SignatureDialog initial={S.signature.initial} />}
      {S.dialog && <ConfirmDialog dialog={S.dialog} />}
      {help && <Help close={() => setHelp(false)} />}
      <input
        hidden
        ref={(el) => (inputs.current.files = el)}
        type="file"
        multiple
        accept={window.WatermarkFormats.accept}
        onChange={(e) => {
          A.importFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        hidden
        ref={(el) => (inputs.current.folder = el)}
        type="file"
        multiple
        webkitdirectory=""
        onChange={(e) => {
          A.importFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        hidden
        ref={(el) => (inputs.current.logo = el)}
        type="file"
        accept={window.WatermarkFormats.accept}
        onChange={(e) => {
          A.logoFile(e.target.files[0]);
          e.target.value = "";
        }}
      />
      <input
        hidden
        ref={(el) => (inputs.current.font = el)}
        type="file"
        accept=".woff2,.woff,.ttf,.otf"
        onChange={(e) => {
          A.fontFile(e.target.files[0]);
          e.target.value = "";
        }}
      />
      <input
        hidden
        ref={(el) => (inputs.current.template = el)}
        type="file"
        accept=".json"
        onChange={(e) => {
          A.templateFile(e.target.files[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
