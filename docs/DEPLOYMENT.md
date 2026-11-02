# Cloudflare Pages 部署

- GitHub 公开仓库：https://github.com/Twinkling/watermark
- 生产分支：`main`；GitHub 来源与自动部署开关已配置，推送触发尚未验证；本次通过 Pages API 触发 Git 构建。
- Pages 项目：`liuyin-watermark`
- 生产域名：https://watermark.huanxiong.site
- Pages 地址：https://liuyin-watermark.pages.dev
- 构建命令：`npm run build:pages`
- 输出目录：`.pages-dist`
- 构建环境：`NODE_VERSION=24`，无运行时密钥或环境变量。
- DNS：`watermark` CNAME → `liuyin-watermark.pages.dev`，Cloudflare 代理开启，TTL 自动。
- 仅发布静态文件，`uses_functions=false`，无需后端、数据库或 Workers 应用。

## 2026-10-31 验证

- 本地 Pages 构建成功；31 项自动化测试全部通过。
- Cloudflare 首次 Git 构建及部署成功，来源为本仓库 `main` 分支。
- Pages 地址的浏览器工作台可以加载示例、输入文字水印并实际下载 1600×1066 PNG。
- 自定义域名和证书验证状态均为 `active`；HTTPS 返回 200，首页内容与本地 Pages 构建逐字节一致。

离线单文件超过 Pages 的 25 MiB 单文件限制，因此保留 `dist/留印.html` 用于本地使用；线上使用独立资源。部署目录不包含测试图、开发文件或参考快照。

域名和证书状态以后续 Cloudflare 控制台实时结果为准，构建及使用方式见仓库 README。

## 2026-11-02 首屏优化

- 在线首屏从约 27.3 MB 降至 656 KB（原始资源总量，减少约 97.6%），gzip 合计约 187 KB。只加载字体目录；字库与备用 HEIC/TIFF 解码器按需下载。
- JS、CSS、字体及解码器使用内容哈希文件名，`/assets/*` 设置一年不可变缓存；HTML 重新验证，避免更新后引用旧资源。
- 本地 Chromium 模拟 1.6 Mbps 下载、100 ms 延迟，冷启动至示例按钮可交互约 1.4 秒；这不是所有用户网络下的线上速度承诺。
- 已验证文字水印 PNG 实际下载、HEIC/透明 TIFF/方向 TIFF 解码、字体选择、解码器失败后重试；普通 PNG 工作流不会请求字库或备用解码器。
- 单文件离线版继续内嵌完整字库与解码器。在线版尚未加载的素材需要网络，图片不上传，CSP 仍禁止 API 连接。
