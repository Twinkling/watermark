import { demoCanvas } from "./demo.js";
import { ensureArtFont } from "./fonts.js";
export const E = window.WatermarkStudio,
  Ink = window.WatermarkSignature;
const Decode = window.WatermarkDecode,
  Core = window.WatermarkCore;
let serial = 0,
  revision = 0,
  pending = null,
  toastTimer;
export const uid = (p) => `${p}_${Date.now().toString(36)}_${++serial}`;
const listeners = new Set();
export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const snapshot = () => revision;
export function emit() {
  revision++;
  listeners.forEach((fn) => fn());
}
function initialDoc() {
  const d = E.defaults();
  Object.assign(d.layers[0], {
    text: "",
    mode: "single",
    angle: 0,
    color: "#ffffff",
    opacity: 85,
    size: 4,
    x: 0.8,
    y: 0.9,
  });
  return d;
}
export const S = {
  items: [],
  active: null,
  base: initialDoc(),
  scope: "all",
  selected: null,
  tool: "watermark",
  panelOpen: false,
  output: { format: "png", quality: 92, suffix: "_水印" },
  assets: new Map(),
  fonts: new Map(),
  original: false,
  zoom: false,
  cropMode: false,
  cropDraft: null,
  cropRatio: 0,
  editTab: "crop",
  busy: false,
  cancel: false,
  progress: null,
  undo: [],
  redo: [],
  templates: [],
  search: "",
  toast: null,
  messages: [],
  dialog: null,
  signature: null,
  dark: false,
};
export const item = () => S.items.find((i) => i.id === S.active);
export const effective = (i) => i?.doc || S.base;
export const doc = () =>
  S.scope === "current" && item() ? effective(item()) : S.base;
export const selected = () =>
  doc().layers.find((l) => l.id === S.selected) || doc().layers[0];
export function toast(text, error = false) {
  clearTimeout(toastTimer);
  S.toast = { text, error };
  emit();
  toastTimer = setTimeout(
    () => {
      S.toast = null;
      emit();
    },
    error ? 8000 : 3500,
  );
}
export function setUI(values) {
  Object.assign(S, values);
  emit();
}
function capture() {
  return JSON.stringify({
    base: S.base,
    overrides: S.items.map((i) => [i.id, i.doc]),
    output: S.output,
  });
}
export function begin() {
  pending ??= capture();
}
export function commit(label = "调整设置") {
  if (pending !== null && pending !== capture()) {
    S.undo.push({ data: pending, label });
    if (S.undo.length > 40) S.undo.shift();
    S.redo = [];
  }
  pending = null;
  emit();
}
function replaceDoc(d) {
  if (S.scope === "current" && item()) item().doc = E.normalize(d);
  else S.base = E.normalize(d);
}
export function edit(fn, label = "调整设置", continuous = false) {
  if (S.busy) return;
  if (!continuous && pending !== null) commit();
  begin();
  const d = E.clone(doc());
  fn(d);
  replaceDoc(d);
  if (continuous) emit();
  else commit(label);
}
export function patchLayer(values, continuous = false) {
  const id = selected()?.id;
  if (id)
    edit(
      (d) =>
        Object.assign(
          d.layers.find((l) => l.id === id),
          values,
        ),
      "调整水印",
      continuous,
    );
}
export function patchEdit(values, continuous = false) {
  edit((d) => Object.assign(d.edit, values), "调整图片", continuous);
}
export function changeOutput(values, continuous = false) {
  if (S.busy) return;
  begin();
  Object.assign(S.output, values);
  if (continuous) emit();
  else commit("调整导出");
}
export function undo(redo = false) {
  if (S.cropMode) {
    finishCrop(false);
    return;
  }
  if (S.busy) return;
  commit();
  const from = redo ? S.redo : S.undo,
    to = redo ? S.undo : S.redo,
    entry = from.pop();
  if (!entry) return;
  to.push({ data: capture(), label: entry.label });
  const v = JSON.parse(entry.data);
  S.base = v.base;
  S.output = v.output;
  for (const [id, d] of v.overrides) {
    const i = S.items.find((i) => i.id === id);
    if (i) i.doc = d;
  }
  S.original = S.cropMode = false;
  emit();
}
export function changeScope(scope) {
  if (S.cropMode) finishCrop();
  if (S.busy) return;
  commit();
  S.scope = scope;
  S.selected = doc().layers[0]?.id;
  S.cropMode = false;
  emit();
}
export function selectPhoto(id) {
  if (S.cropMode) finishCrop();
  if (S.busy) return;
  commit();
  S.active = id;
  S.selected = doc().layers[0]?.id;
  S.cropMode = S.original = false;
  emit();
}
export function restoreBatch() {
  if (S.busy) return;
  if (S.cropMode) finishCrop(false);
  begin();
  if (item()) item().doc = null;
  commit("恢复整批设置");
}
export function openTool(tool) {
  if (S.cropMode) finishCrop();
  commit();
  S.tool = tool;
  S.panelOpen = true;
  S.cropMode = false;
  emit();
}
export function selectLayer(id) {
  commit();
  S.selected = id;
  emit();
}
export function layerAction(action, id = selected()?.id) {
  const l = doc().layers.find((l) => l.id === id);
  if (!l) return;
  edit((d) => {
    const index = d.layers.findIndex((a) => a.id === l.id);
    if (action === "delete") {
      d.layers.splice(index, 1);
      if (S.selected === l.id)
        S.selected = d.layers[Math.min(index, d.layers.length - 1)]?.id;
    }
    if (action === "visibility") d.layers[index].visible = !l.visible;
    if (action === "duplicate" && d.layers.length < 12) {
      const next = {
        ...E.clone(l),
        id: uid("mark"),
        name: uniqueLayerName(
          layerLabel(l)
            .replace(/ 副本(?: \d+)?$/, "")
            .slice(0, 48) + " 副本",
        ),
        x: Math.min(0.95, l.x + 0.04),
        y: Math.min(0.95, l.y + 0.04),
      };
      d.layers.push(next);
      S.selected = next.id;
    }
    if (action === "front" && index < d.layers.length - 1)
      [d.layers[index], d.layers[index + 1]] = [
        d.layers[index + 1],
        d.layers[index],
      ];
    if (action === "back" && index > 0)
      [d.layers[index], d.layers[index - 1]] = [
        d.layers[index - 1],
        d.layers[index],
      ];
  }, "管理水印");
}

export function layerLabel(l) {
  return (
    l.name ||
    (l.type === "logo"
      ? S.assets.get(l.asset)?.name || "图片水印"
      : l.text.trim() || "文字水印")
  );
}
function uniqueLayerName(base) {
  base = base.slice(0, 54);
  const used = new Set(doc().layers.map(layerLabel));
  let name = base,
    index = 2;
  while (used.has(name)) name = base + " " + index++;
  return name;
}
export function startCrop() {
  if (S.busy || !item()) return;
  if (item().doc && S.scope === "all") changeScope("current");
  commit();
  const e = doc().edit;
  S.cropDraft = {
    crop: E.cropFor(item().width, item().height, e),
    cropAspect: e.cropAspect,
  };
  S.cropRatio = e.cropAspect;
  S.cropMode = true;
  S.original = false;
  S.zoom = false;
  S.panelOpen = false;
  emit();
}
export function cropPreset(ratio) {
  if (!S.cropMode) startCrop();
  if (!S.cropMode) return;
  const p = item(),
    crop = ratio
      ? E.cropFor(p.width, p.height, { cropAspect: ratio })
      : S.cropDraft.crop;
  S.cropRatio = ratio;
  S.cropDraft = { crop, cropAspect: ratio };
  emit();
}
export function updateCrop(crop) {
  if (!S.cropMode) return;
  S.cropDraft = { crop, cropAspect: 0 };
  emit();
}
export function finishCrop(apply = true) {
  if (!S.cropMode) return;
  const draft = S.cropDraft;
  S.cropMode = false;
  S.cropDraft = null;
  S.cropRatio = 0;
  if (apply && draft) patchEdit(draft);
  else emit();
}
export function setEditTab(tab) {
  if (S.cropMode) finishCrop();
  S.editTab = tab;
  emit();
}
function addLayer(type, asset = "", extra = {}) {
  if (doc().layers.length >= 12) throw Error("最多添加 12 个水印");
  edit((d) => {
    if (
      d.layers.length === 1 &&
      d.layers[0].type === "text" &&
      !d.layers[0].text.trim()
    )
      d.layers = [];
    const l = E.layer(type, uid("mark"));
    Object.assign(
      l,
      {
        mode: "single",
        angle: 0,
        opacity: 90,
        x: 0.8,
        y: 0.85,
        color: "#ffffff",
        text: type === "text" ? "新的水印" : "我的签名",
        size: type === "logo" ? 22 : 4,
      },
      extra,
      { asset },
      {
        name:
          type === "logo"
            ? uniqueLayerName(
                S.assets.get(asset)?.signature
                  ? "手写签名"
                  : S.assets.get(asset)?.name || "图片水印",
              )
            : "",
      },
    );
    d.layers.push(l);
    S.selected = l.id;
  }, "添加水印");
  S.tool = "watermark";
  S.panelOpen = true;
  emit();
}
export function addText() {
  const empty = doc().layers.find((l) => l.type === "text" && !l.text.trim());
  if (empty) {
    S.selected = empty.id;
    S.tool = "watermark";
    S.panelOpen = true;
    emit();
    return;
  }
  try {
    addLayer("text");
  } catch (e) {
    toast(e.message, true);
  }
}
export async function ask(
  title,
  text,
  { input = false, value = "", confirm = "确定" } = {},
) {
  commit();
  if (S.dialog) return null;
  return new Promise((resolve) => {
    S.dialog = { title, text, input, value, confirm, resolve };
    emit();
  });
}
export function closeDialog(value = null) {
  const d = S.dialog;
  S.dialog = null;
  emit();
  d?.resolve(value);
}
export async function preset(name) {
  if (
    doc().layers.length > 1 &&
    !(await ask(
      "替换当前水印？",
      "预设会替换当前范围的水印和图片设置，之后可以撤销。",
    ))
  )
    return;
  const d = E.defaults(),
    l = d.layers[0];
  l.id = uid("mark");
  if (["work", "signature", "social"].includes(name))
    Object.assign(l, {
      text: name === "signature" ? "我的签名" : "© 我的原创作品",
      type: name === "signature" ? "signature" : "text",
      font: name === "signature" ? "hand" : "sans",
      mode: "single",
      angle: 0,
      opacity: 85,
      color: "#ffffff",
      x: 0.85,
      y: 0.9,
      size: 4,
    });
  if (name === "draft")
    Object.assign(l, {
      text: "内部预览 · 请勿传播",
      color: "#a65446",
      opacity: 28,
      size: 5,
    });
  if (name === "shop")
    Object.assign(l, {
      text: "原创实拍 · 请勿盗用",
      color: "#ffffff",
      opacity: 45,
      stroke: 2,
      size: 4,
    });
  if (name === "social")
    Object.assign(d.edit, { resize: 1200, frame: "gallery", frameSize: 5 });
  edit((target) => Object.assign(target, d), "应用预设");
  S.selected = l.id;
  S.tool = "watermark";
  emit();
}
export function release(a) {
  a.image?.close?.();
  if (a.image instanceof HTMLCanvasElement) a.image.width = a.image.height = 1;
  if (a.cache) a.cache.width = a.cache.height = 1;
}
function thumbnail(image, w, h) {
  const c = document.createElement("canvas"),
    r = Math.min(1, 160 / w, 100 / h);
  c.width = Math.round(w * r);
  c.height = Math.round(h * r);
  c.getContext("2d").drawImage(image, 0, 0, c.width, c.height);
  const data = c.toDataURL();
  c.width = c.height = 1;
  return data;
}
export async function job(fn) {
  if (S.cropMode) finishCrop();
  if (S.busy) return;
  commit();
  S.busy = true;
  S.cancel = false;
  emit();
  try {
    return await fn();
  } catch (e) {
    toast(e.name === "AbortError" ? "已取消" : e.message, true);
  } finally {
    S.busy = false;
    S.progress = null;
    emit();
  }
}
export async function importFiles(files) {
  return job(async () => {
    let total = S.items.reduce((a, i) => a + i.width * i.height, 0),
      added = 0,
      duplicates = 0;
    const errors = [],
      list = [...files];
    for (let k = 0; k < list.length; k++) {
      if (S.cancel) {
        errors.push("已停止添加，已导入的图片保留。");
        break;
      }
      if (S.items.length >= 40) {
        errors.push("单批最多 40 张，请分批处理。");
        break;
      }
      const f = list[k],
        fingerprint = `${f.name}:${f.size}:${f.lastModified}`;
      if (S.items.some((i) => i.fingerprint === fingerprint)) {
        duplicates++;
        continue;
      }
      if (f.size > 50 * 1048576) {
        errors.push(`${f.name}：超过 50 MB`);
        continue;
      }
      S.progress = {
        text: `正在添加 ${k + 1}/${list.length} · ${f.name}`,
        value: k,
        max: list.length,
      };
      emit();
      let image;
      try {
        const result = await Decode.decode(f, {
          maxPixels: Math.min(32e6, 160e6 - total),
          onStatus: (t) => {
            S.progress.text = t;
            emit();
          },
        });
        image = result.image;
        const width = image.width || image.naturalWidth,
          height = image.height || image.naturalHeight;
        const i = {
          id: uid("photo"),
          name: f.name,
          bytes: f.size,
          fingerprint,
          image,
          width,
          height,
          thumbnail: thumbnail(image, width, height),
          doc: null,
        };
        total += width * height;
        S.items.push(i);
        S.active ??= i.id;
        image = null;
        added++;
        errors.push(...result.notes.map((n) => `${f.name}：${n}`));
      } catch (e) {
        if (image) release({ image });
        errors.push(`${f.name}：${e.message}`);
      }
      await new Promise((r) => setTimeout(r, 0));
    }
    if (duplicates) errors.push(`已跳过 ${duplicates} 张重复图片`);
    S.messages = errors;
    S.undo = [];
    S.redo = [];
    S.panelOpen = false;
    toast(
      added ? `已添加 ${added} 张图片` : "没有新增图片",
      !added && !duplicates,
    );
  });
}
export async function demo() {
  const old = S.items.find((i) => i.name === "生活片刻_示例.png");
  if (old) return selectPhoto(old.id);
  const c = demoCanvas();
  await importFiles([
    new File([await canvasBlob(c)], "生活片刻_示例.png", {
      type: "image/png",
      lastModified: 1,
    }),
  ]);
  c.width = c.height = 1;
}
export async function removePhoto(id) {
  if (S.cropMode) finishCrop(false);
  if (S.busy) return;
  const i = S.items.find((i) => i.id === id);
  if (!i) return;
  release(i);
  S.items = S.items.filter((i) => i.id !== id);
  if (S.active === id) S.active = S.items[0]?.id || null;
  pending = null;
  S.undo = [];
  S.redo = [];
  if (!S.items.length) S.scope = "all";
  emit();
}
export async function clearPhotos() {
  if (!(await ask("清空图片？", "只清空本次会话，原文件不受影响。"))) return;
  finishCrop(false);
  S.items.forEach(release);
  S.items = [];
  S.active = null;
  S.scope = "all";
  pending = null;
  S.undo = [];
  S.redo = [];
  emit();
}
export function canvasBlob(c, type = "png", quality = 92) {
  return new Promise((resolve, reject) =>
    c.toBlob(
      (b) => (b ? resolve(b) : reject(Error("图片编码失败，请减小输出尺寸"))),
      "image/" + type,
      quality / 100,
    ),
  );
}
export function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function outputName(name, format, used) {
  const suffix = S.output.suffix
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
      .slice(0, 40),
    base =
      name
        .replace(/\.[^.]+$/, "")
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
        .replace(/^\.+/, "")
        .slice(0, 85) || "图片",
    ext = format === "jpeg" ? "jpg" : format;
  let n = `${base}${suffix}.${ext}`,
    k = 2;
  while (used.has(n.toLowerCase())) n = `${base}${suffix}_${k++}.${ext}`;
  used.add(n.toLowerCase());
  return n;
}
export async function exportImages(
  targets = S.items,
  { marks = false, share = false } = {},
) {
  if (S.cropMode) finishCrop();
  if (!targets.length) return;
  if (
    marks &&
    !effective(targets[0]).layers.some(
      (l) => l.visible && (l.type === "logo" ? l.asset : l.text.trim()),
    )
  )
    return toast("请先添加水印或签名", true);
  const frozen = targets.map((i) => ({ ...i, doc: E.clone(effective(i)) })),
    output = { ...S.output };
  return job(async () => {
    const files = [],
      used = new Set();
    let total = 0;
    for (let k = 0; k < frozen.length; k++) {
      if (S.cancel) throw Error("已取消导出");
      const i = frozen[k];
      S.progress = {
        text: `正在导出 ${k + 1}/${frozen.length} · ${i.name}`,
        value: k,
        max: frozen.length,
      };
      emit();
      await new Promise((r) => setTimeout(r, 10));
      const c = document.createElement("canvas");
      try {
        const type = marks ? "png" : output.format;
        E.render(c, i.image, i.doc, S.assets, {
          format: type,
          watermarkOnly: marks,
        });
        const b = await canvasBlob(c, type, output.quality);
        if (b.type !== `image/${type}`)
          throw Error("当前浏览器不支持该格式，请选择 PNG");
        if (S.cancel) throw Error("已取消导出");
        total += b.size;
        if (total > 512 * 1048576)
          throw Error("导出超过 512 MB，请分批处理或使用 JPG");
        const name = marks
          ? "留印_透明水印.png"
          : outputName(i.name, type, used);
        if (frozen.length === 1) {
          if (share) {
            const f = new File([b], name, { type: b.type });
            if (!navigator.canShare?.({ files: [f] }))
              throw Error("当前浏览器不支持系统分享，请下载图片");
            await navigator.share({ files: [f] });
          } else download(b, name);
        } else
          files.push({ name, data: new Uint8Array(await b.arrayBuffer()) });
      } finally {
        c.width = c.height = 1;
      }
    }
    if (files.length) download(Core.zip(files), `留印_${files.length}张.zip`);
    toast("已发起下载");
  });
}
export async function logoFile(file) {
  if (!file) return;
  return job(async () => {
    if (doc().layers.length >= 12) throw Error("最多添加 12 个水印");
    if (file.size > 10 * 1048576) throw Error("Logo 请控制在 10 MB 以内");
    if (S.assets.size >= 40) throw Error("本次素材较多，请导出后刷新");
    const { image } = await Decode.decode(file, { maxPixels: 4e6 }),
      id = uid("logo"),
      width = image.width || image.naturalWidth,
      height = image.height || image.naturalHeight,
      c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    c.getContext("2d").drawImage(image, 0, 0);
    const data = c.toDataURL();
    c.width = c.height = 1;
    S.assets.set(id, { image, width, height, data, name: file.name });
    S.busy = false;
    addLayer("logo", id);
    S.busy = true;
  });
}
export function openSignature(rewrite = false) {
  if (S.busy) return;
  const l = selected(),
    a = rewrite && l ? S.assets.get(l.asset) : null;
  if (!rewrite && doc().layers.length >= 12)
    return toast("最多添加 12 个水印", true);
  commit();
  const initial = Ink.normalize(a?.signature);
  if (a?.signature && l.tint) initial.color = l.color;
  S.signature = { target: rewrite ? l?.id : null, initial };
  emit();
}
export function applySignature(data) {
  try {
    if (S.assets.size >= 40) throw Error("本次素材较多，请导出后刷新");
    const normalized = Ink.normalize(data),
      image = Ink.toCanvas(normalized),
      id = uid("ink");
    S.assets.set(id, {
      image,
      width: image.width,
      height: image.height,
      data: image.toDataURL(),
      name: "手写签名",
      signature: normalized,
    });
    const target = S.signature?.target;
    S.signature = null;
    if (target && doc().layers.some((l) => l.id === target)) {
      edit((d) => {
        const l = d.layers.find((l) => l.id === target);
        l.asset = id;
        l.tint = false;
        l.removeWhite = 0;
      }, "重写签名");
    } else addLayer("logo", id, { opacity: 100, size: 25 });
    S.original = false;
    S.panelOpen = false;
    toast("签名已添加，可在图片上拖动位置");
  } catch (e) {
    toast(e.message, true);
  }
}
async function registerFont(id, font) {
  if (
    !/^data:font\/woff2;base64,[A-Za-z0-9+/=]+$/.test(font.data) ||
    font.data.length > 3e6
  )
    throw Error("字体文件无效");
  const face = new FontFace(id, `url("${font.data}")`);
  await face.load();
  document.fonts.add(face);
  S.fonts.set(id, font);
}
export async function selectFont(id) {
  return job(async () => {
    await ensureArtFont(id);
    S.busy = false;
    patchLayer({ font: id });
    S.busy = true;
    return true;
  });
}
export async function fontFile(file) {
  if (!file) return;
  return job(async () => {
    if (file.size > 2 * 1048576) throw Error("字体请控制在 2 MB 以内");
    let binary = "";
    for (const byte of new Uint8Array(await file.arrayBuffer()))
      binary += String.fromCharCode(byte);
    const id = uid("font");
    await registerFont(id, {
      name: file.name,
      data: "data:font/woff2;base64," + btoa(binary),
    });
    S.busy = false;
    patchLayer({ font: id });
    S.busy = true;
  });
}
export function packageTemplate(name = "我的水印") {
  const d = E.normalize(doc()),
    assets = {},
    fonts = {};
  for (const l of d.layers) {
    const a = S.assets.get(l.asset);
    if (a)
      assets[l.asset] = {
        data: a.data,
        name: a.name,
        ...(a.signature ? { signature: Ink.normalize(a.signature) } : {}),
      };
    if (S.fonts.has(l.font)) fonts[l.font] = S.fonts.get(l.font);
  }
  return {
    version: 2,
    id: uid("template"),
    name,
    doc: d,
    assets,
    fonts,
    savedAt: Date.now(),
    pinned: false,
  };
}
function persist(list) {
  const text = JSON.stringify(list);
  if (text.length > 4e6) throw Error("本地模板空间不足，请导出模板文件");
  localStorage.setItem("liuyin.templates.v2", text);
  S.templates = list;
  emit();
}
export async function saveTemplate() {
  const name = await ask(
    "保存为模板",
    "水印、签名和编辑设置会保存在当前浏览器，不包含原图。",
    { input: true, value: "我的水印", confirm: "保存" },
  );
  if (!name?.trim()) return;
  try {
    persist([...S.templates, packageTemplate(name.trim())]);
    toast("模板已保存");
  } catch (e) {
    toast(e.message, true);
  }
}
export function exportTemplate() {
  download(
    new Blob([JSON.stringify(packageTemplate(), null, 2)], {
      type: "application/json",
    }),
    "留印_模板.json",
  );
}
export async function loadTemplate(t) {
  return job(async () => {
    if (
      t?.version !== 2 ||
      !Array.isArray(t.doc?.layers) ||
      t.doc.layers.length > 12
    )
      throw Error("不是有效的留印模板");
    const d = E.normalize(t.doc),
      entries = Object.entries(t.assets || {}),
      fontEntries = Object.entries(t.fonts || {});
    if (entries.length > 12 || fontEntries.length > 12)
      throw Error("模板素材数量过多");
    const staged = [],
      remap = new Map(),
      fontMap = new Map();
    try {
      for (const [id, a] of entries) {
        if (
          !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(a.data) ||
          a.data.length > 12e6
        )
          throw Error("模板图片无效");
        const bytes = Uint8Array.from(atob(a.data.split(",")[1]), (c) =>
          c.charCodeAt(0),
        );
        const { image } = await Decode.decode(
            new File([bytes], "logo.png", { type: "image/png" }),
            { maxPixels: 4e6 },
          ),
          newId = uid("logo");
        remap.set(id, newId);
        staged.push([
          newId,
          {
            image,
            width: image.width || image.naturalWidth,
            height: image.height || image.naturalHeight,
            data: a.data,
            name: String(a.name || "Logo"),
            ...(a.signature ? { signature: Ink.normalize(a.signature) } : {}),
          },
        ]);
      }
      for (const [id, font] of fontEntries) {
        const newId = uid("font");
        await registerFont(newId, font);
        fontMap.set(id, newId);
      }
      for (const l of d.layers) {
        l.id = uid("mark");
        await ensureArtFont(l.font);
        if (l.type === "logo") {
          if (!remap.has(l.asset)) throw Error("模板缺少图片");
          l.asset = remap.get(l.asset);
        }
        if (l.font.startsWith("font_")) {
          if (!fontMap.has(l.font)) throw Error("模板缺少字体");
          l.font = fontMap.get(l.font);
        }
      }
      staged.forEach(([id, a]) => S.assets.set(id, a));
      for (const [index, l] of d.layers.entries())
        if (!l.name && l.type === "logo")
          l.name =
            (S.assets.get(l.asset)?.signature
              ? "手写签名"
              : S.assets.get(l.asset)?.name || "图片水印") +
            " " +
            (index + 1);
      S.busy = false;
      edit((target) => Object.assign(target, d), "应用模板");
      S.busy = true;
      S.selected = d.layers[0]?.id;
      S.tool = "watermark";
      toast("模板已应用");
    } catch (e) {
      staged.forEach(([, a]) => release(a));
      throw e;
    }
  });
}
export async function templateFile(file) {
  if (!file) return;
  try {
    if (file.size > 15 * 1048576) throw Error("模板文件超过 15 MB");
    await loadTemplate(JSON.parse(await file.text()));
  } catch (e) {
    toast(e.message, true);
  }
}
export async function templateAction(action, t) {
  let list = E.clone(S.templates),
    entry = list.find((a) => a.id === t.id);
  if (!entry) return;
  if (action === "pin") entry.pinned = !entry.pinned;
  if (action === "rename") {
    const name = await ask("重命名模板", "输入新的名称", {
      input: true,
      value: t.name,
    });
    if (!name?.trim()) return;
    entry.name = name.trim();
  }
  if (action === "copy")
    list.push({
      ...E.clone(t),
      id: uid("template"),
      name: t.name + " 副本",
      savedAt: Date.now(),
    });
  if (action === "delete") {
    if (
      !(await ask("删除模板？", `将删除“${t.name}”，不影响磁盘文件。`, {
        confirm: "删除",
      }))
    )
      return;
    list = list.filter((a) => a.id !== t.id);
  }
  try {
    persist(list);
  } catch (e) {
    toast(e.message, true);
  }
}
export function autoColor() {
  const i = item();
  if (!i) return;
  const c = document.createElement("canvas");
  c.width = 120;
  c.height = Math.max(1, Math.round((i.height / i.width) * 120));
  const x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(i.image, 0, 0, c.width, c.height);
  const p = x.getImageData(0, 0, c.width, c.height).data;
  let total = 0,
    n = 0;
  for (let k = 0; k < p.length; k += 4)
    if (p[k + 3] > 128) {
      total += 0.2126 * p[k] + 0.7152 * p[k + 1] + 0.0722 * p[k + 2];
      n++;
    }
  c.width = c.height = 1;
  patchEdit({
    brightness: Math.max(
      -35,
      Math.min(35, Math.round((128 - total / Math.max(n, 1)) / 1.6)),
    ),
  });
}
try {
  const list = JSON.parse(localStorage.getItem("liuyin.templates.v2") || "[]");
  if (Array.isArray(list))
    S.templates = list
      .filter(
        (t) =>
          t.version === 2 &&
          typeof t.name === "string" &&
          Array.isArray(t.doc?.layers),
      )
      .slice(0, 40);
} catch {}
window.addEventListener("pagehide", (e) => {
  if (e.persisted) return;
  S.items.forEach(release);
  S.assets.forEach(release);
});
