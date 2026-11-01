# 公开仓库的隐私检查

本项目只公开程序、依赖许可证、合成测试图和产品界面截图。个人照片、真实签名、模板导出、控制台截图、环境文件、登录配置与密钥不应提交。

## 本地提交前保护

安装 [Gitleaks](https://github.com/gitleaks/gitleaks)，然后在本仓库启用检查：

```sh
brew install gitleaks
git config --local core.hooksPath .githooks
git config --local user.email "你的GitHub隐私邮箱"
```

隐私邮箱可从 GitHub Settings → Emails 查看，格式为 `数字ID+用户名@users.noreply.github.com`。这些 Git 设置仅写入本机 `.git/config`，不提交到仓库。

钩子会检查作者和提交者是否使用 GitHub 隐私邮箱，拦截被强制暂存的常见凭据文件与本机私有目录，再扫描暂存内容中的密钥及个人 macOS 路径；缺少扫描器时阻止提交。`.gitignore` 排除常见环境文件、开发凭据、HAR、私钥、本机工具配置和测试结果。Git 钩子不会随克隆自动启用，换设备后需重新配置；忽略规则也不能替代内容检查。

完整历史扫描：

```sh
gitleaks git . --log-opts="--all --full-history" --redact=100
```

扫描报告保留在本机，避免将命中的原文、凭据或控制台截图再上传。第三方许可证中的公开作者联系方式应保留；依赖自带的通用构建路径不代表本机用户目录。扫描通过不能保证不存在所有类型的隐私信息，新增截图、照片、字体或二进制素材仍需人工核对。
