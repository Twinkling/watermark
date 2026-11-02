# 本地图片解码器

所有解码器随项目保存在 `vendor/codecs.js`，运行时不访问 CDN、不上传图片。`scripts/vendor.cjs` 从锁定的 npm 包重新构建；修改版本后执行 `npm ci && npm run build`。源文件、适配代码和构建脚本均可修改，重建后即可替换内置解码器。

| 组件                               | 版本                           | 许可       | 来源                                   |
| ---------------------------------- | ------------------------------ | ---------- | -------------------------------------- |
| heic-to 中的 CSP-safe libheif 构建 | heic-to 1.6.6 / libheif 1.23.6 | LGPL-3.0   | https://github.com/hoppergee/heic-to   |
| libheif                            | 1.23.6                         | LGPL-3.0   | https://github.com/strukturag/libheif  |
| libde265（包含在上述构建中）       | 1.0.16                         | LGPL-3.0   | https://github.com/strukturag/libde265 |
| UTIF.js                            | 3.1.0                          | MIT        | https://github.com/photopea/UTIF.js    |
| pako inflate                       | 1.0.11                         | MIT / Zlib | https://github.com/nodeca/pako         |

完整许可保存在 `vendor/licenses/`，发行包复制到 `dist/licenses/`；GPL v3 全文在项目 `LICENSE`。libheif 来源是 heic-to 包中 `src/lib/libheif-without-unsafe-eval.js`；唯一的包装调整是移除 ESM `export default buildLibheif`，以便在本地经典 Worker 中执行。未修改底层编解码算法。HEIC 主图选择、尺寸预算、释放、错误与超时管理在本项目 `src/codec-worker.js` 和 `src/decode.js` 中实现。

对应源码和构建说明：heic-to 仓库 README 的 libheif 构建章节；上游使用 `USE_UNSAFE_EVAL=0 USE_WASM=0 LIBDE265_VERSION=1.0.16`。TIFF 和 Deflate 的源码与版权声明随 npm 包和生成的 Worker 源码一起保留。项目仍采用 GPL-3.0-only。

## 界面组件与构建（v3.4）

React 19.3.1、React DOM 19.3.1 及其 Scheduler 运行时采用 MIT 许可；Lucide React 1.61.0 的图标采用 ISC 许可，具体版权以包内 LICENSE 为准。这些组件全部编译进本地 ui.js，不使用运行时 CDN。完整许可随发行物放在 dist/licenses/react.LICENSE、react-dom.LICENSE、scheduler.LICENSE、lucide-react.LICENSE。Vite 8.3.5 仅用于本地构建（MIT），不启动应用服务器或上传图片。

shadcn/ui 采用 MIT 许可，从官方 New York 注册表引入 12 个组件源码文件，保存在 `src/components/ui/`；下载来源与原始注册表 SHA-256 在 `sources.json`，完整许可证在同目录 `LICENSE.md`。本地适配包含导入路径、隐藏重复弹窗关闭按钮、滑块可访问名称、紧凑尺寸和现有主题映射。组件源码可直接维护，不依赖运行时在线注册表。

Radix UI Primitives、class-variance-authority、clsx、tailwind-merge 等运行依赖版本锁定在 `package-lock.json`；`scripts/ui-licenses.cjs` 收集完整依赖许可到 `dist/licenses/ui/` 并输出版本清单。react-remove-scroll-bar 2.3.8 的 npm 包未附 LICENSE 文件，按其 MIT 元数据从[上游 LICENSE](https://github.com/theKashey/react-remove-scroll-bar/blob/master/LICENSE)补入 `vendor/licenses/ui/react-remove-scroll-bar.LICENSE`。Tailwind CSS 与 Vite 插件只在构建时使用；生成样式内联到离线 HTML，不使用浏览器端 Tailwind/CDN。

官方资料：[shadcn/ui](https://ui.shadcn.com/docs)、[Radix UI](https://www.radix-ui.com/primitives)、[React](https://react.dev/learn)、[Vite](https://vite.dev/guide/)、[Lucide React](https://lucide.dev/guide/react)。

## 内置艺术字体（v3.3）

以下 12 款字体均采用 SIL Open Font License 1.1，允许免费商用设计、嵌入和随软件分发。字体文件本身不得单独售卖，分发时须保留版权及许可证；用字体制作的图片不要求采用 OFL。系统字体与用户导入字体以各自授权为准。

| 字体 | 风格 | 原始字体与授权 |
| --- | --- | --- |
| 马善政毛笔 / Ma Shan Zheng | 中文 · 毛笔 | [原始字体](https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/mashanzheng/MaShanZheng-Regular.ttf) · [OFL 1.1](https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/mashanzheng/OFL.txt) |
| 龙藏手写 / Long Cang | 中文 · 行草 | [原始字体](https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/longcang/LongCang-Regular.ttf) · [OFL 1.1](https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/longcang/OFL.txt) |
| 站酷快乐体 / ZCOOL KuaiLe | 中文 · 活泼 | [原始字体](https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/zcoolkuaile/ZCOOLKuaiLe-Regular.ttf) · [OFL 1.1](https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/zcoolkuaile/OFL.txt) |
| 志莽行书 / Zhi Mang Xing | 中文 · 行书 | [原始字体](https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/zhimangxing/ZhiMangXing-Regular.ttf) · [OFL 1.1](https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/zhimangxing/OFL.txt) |
| 刘建毛草 / Liu Jian Mao Cao | 中文 · 草书 | [原始字体](https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/liujianmaocao/LiuJianMaoCao-Regular.ttf) · [OFL 1.1](https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/liujianmaocao/OFL.txt) |
| 霞鹜文楷 TC / LXGW WenKai TC | 中文 · 手写楷书 | [原始字体](https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/lxgwwenkaitc/LXGWWenKaiTC-Regular.ttf) · [OFL 1.1](https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/lxgwwenkaitc/OFL.txt) |
| Dancing Script / Dancing Script | 英文 · 连笔 | [原始字体](https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/dancingscript/DancingScript%5Bwght%5D.ttf) · [OFL 1.1](https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/dancingscript/OFL.txt) |
| Great Vibes / Great Vibes | 英文 · 花体 | [原始字体](https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/greatvibes/GreatVibes-Regular.ttf) · [OFL 1.1](https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/greatvibes/OFL.txt) |
| Caveat / Caveat | 英文 · 手写 | [原始字体](https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/caveat/Caveat%5Bwght%5D.ttf) · [OFL 1.1](https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/caveat/OFL.txt) |
| Allura / Allura | 英文 · 书法 | [原始字体](https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/allura/Allura-Regular.ttf) · [OFL 1.1](https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/allura/OFL.txt) |
| Sacramento / Sacramento | 英文 · 签名字体 | [原始字体](https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/sacramento/Sacramento-Regular.ttf) · [OFL 1.1](https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/sacramento/OFL.txt) |
| Kalam / Kalam | 英文 · 手写 | [原始字体](https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/kalam/Kalam-Regular.ttf) · [OFL 1.1](https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/kalam/OFL.txt) |

来源锁定于 Google Fonts 提交 `e7db6ca603fd4862010383ff17ffd6cc4ffac1c0`。完整字体、版权与许可证在 `vendor/fonts/`；源文件及随包文件的 SHA-256、字符数见 `manifest.json`。用于实际水印的完整字体保留全部源字库字符。霞鹜文楷 TC 保留上游 TC 字形，包含简繁常用字；英文款的中文使用系统字体回退。

Dancing Script 与 Sacramento 有保留字体名称，保持原始 TTF 字节不变。其余字体仅用 FontTools 4.60.1 转换为 WOFF2，未裁字或改绘字形。

在线版的字体卡片另用 `*.preview.woff2`，仅保留示例文案字形，由 FontTools 4.60.1 生成。所有预览字体的内部名称均改为 `LiuyinPreview-*`，保留版权与 OFL 许可；完整字体文件保持不变，用于实际水印与导出。生成脚本为 `scripts/font-previews.py`，普通构建直接使用已提交的预览文件并校验哈希与示例文案。

构建从本地文件生成 `vendor/fonts.js`，运行时不访问字体 CDN。单文件 HTML 内嵌完整字库及授权，可在“选择字体 → 字体来源与商用授权”查看；独立授权文件随发行物放在 `dist/licenses/fonts/`。在线版按当前分类加载小预览，应用或恢复模板会等待所选完整字体加载成功；离线版直接复用内嵌完整字体。模板记录稳定内置字体 ID；新增 6 款字体的模板需要 v3.3 或更新版本。

重新获取同一来源：在独立 Python 环境安装 `fonttools[woff]==4.60.1`，运行 `python scripts/fetch-fonts.py` 和 `python scripts/font-previews.py`，再运行 `npm run build`。普通构建不访问网络。
