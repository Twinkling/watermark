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
- Cloudflare 首次 Git 构建及部署成功，来源提交为 `3521ab15d727c61c7dedd64795a63663f3ee9106`。
- Pages 地址的浏览器工作台可以加载示例、输入文字水印并实际下载 1600×1066 PNG。
- 自定义域名和证书验证状态均为 `active`；HTTPS 返回 200，首页内容与本地 Pages 构建逐字节一致。

离线单文件超过 Pages 的 25 MiB 单文件限制，因此保留 `dist/留印.html` 用于本地使用；线上使用独立资源。部署目录不包含测试图、开发文件或参考快照。

域名和证书状态以后续 Cloudflare 控制台实时结果为准，构建及使用方式见仓库 README。
