# 来源与修改

- 原项目：<https://github.com/jzsn2018/offline-photo-watermark>
- 原项目作者：jzsn2018；上游来源：joyqi/sfz。
- 对照版本：`e0ab13ee99642523666a10adae41dbdf7002451d`。
- 原始页面与 README 已保存到 `reference/`，GPL v3 全文保留在 `LICENSE`。
- 本地版本修改日期：2026-10-26（America/Los_Angeles）。

本地版本重新实现了工作台界面、状态管理与渲染调度，增加拖拽/粘贴、预设、队列管理、原图对比、可调角度与布局、格式控制及 ZIP 打包，保留纯浏览器本地处理。`src/core.js`、`src/studio.js`、`src/ui/` 和 `src/signature.js` 是本地版本代码；`reference/original.html` 未修改。项目采用 GPL-3.0-only。

v2 新增 `src/studio.js` 文档模型与统一渲染器，重写工作台交互，补充多层水印、Logo、签名、图片编辑、外观、模板与逐图设置。Watermark.ws 仅作为功能参考，未复制其代码、字体或素材。

v3 将界面迁移至 React + Vite，统一使用 Lucide SVG 图标，采用中性背景与紫色强调，简化设置层级并实现真实手写签名。Photoroom 与 Adobe Express 只作为视觉参考，没有复制其代码或素材。
