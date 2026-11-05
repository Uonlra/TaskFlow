# GitHub Releases 自动更新与 beta 发布

应用版本 `2.2.0-beta.1`，使用 electron-updater 6.8.11、electron-builder 26.18.0 和 Windows NSIS。设置页的“应用更新”不要求登录云端账户。

## 行为

- 打包程序启动后 10 秒检查一次，此后每 6 小时检查；用户也可手动检查。
- 不自动下载，不在普通退出时自动安装。下载完成后必须点击“重启并安装”并二次确认，随后静默安装并重启。
- 已下载的更新不会被另一轮检查重置；检查、下载防止重复并发。下载或校验失败时禁止安装，可以重试。
- beta 程序显式使用 `beta` 通道，允许预发布；稳定版使用 `latest` 且不接收预发布。设置通道后显式关闭 `allowDowngrade`。
- 更新 IPC 只接受本地桌面主框架，网页及子框架不能发起安装；渲染层不能指定 feed、路径或任意命令。更新源由打包配置生成的 `app-update.yml` 固定为 `Uonlra/TaskFlow`。
- 沿用更新器的 SHA-512 校验和可配置的 Windows 发布者签名验证，没有重写签名验证器。用户已确认本轮先准备未签名测试版，并注明 Windows 安全提示；未签名包不能提供发布者身份保证。

上述配置依据 [v26 自动更新说明](https://www.electron.build/v26/docs/features/auto-update/) 和 [更新通道说明](https://www.electron.build/v26/docs/tutorials/release-using-channels/)。GitHub 的发布通道必须显式配置，不能仅凭版本号推断；beta 构建不生成 `latest.yml`，避免误投正式通道。

## 本地构建

```powershell
pnpm desktop:dist
pnpm desktop:verify-release
```

本地默认输出 `dist/electron`；验收使用独立输出目录，避免混入旧安装包的 `latest.yml`。发布包必须连接生产 API `https://www.uta4k.top`。验证脚本检查 beta.yml、安装包大小和 SHA-512、blockmap、通道与仓库配置，生成 SHA-256 清单和发布清单。

## Windows 自动更新验收

```powershell
pnpm desktop:web-build
pnpm desktop:smoke:update
```

构建两个不同版本的隔离 NSIS 包，以本机 HTTP 更新源验证真实更新器。测试入口 `scripts/fixtures/update-test-main.cjs` 仅由验收构建引入，不包含在正式安装包中；它只允许回环更新源、使用独立应用标识，并阻断外部网络。验证服务不可用、禁止降级、损坏校验、下载后普通退出不安装、确认安装后重启及加密任务/身份/工作区/队列保留。

报告位于 `dist/update-acceptance/run-<时间戳>/report.json`。失败可 `node scripts/smoke-desktop-update.mjs --resume=<时间戳>` 复用包重跑，旧测试数据会先备份；源码变更后须添加 `--rebuild`，不能用旧包冒充新代码。

同步、本地及安装验收脚本设置 `TASKFLOW_DISABLE_UPDATE_CHECK=1`，仅跳过主进程定时更新检查，不禁用手动更新能力。

## GitHub 草稿流水线

`.github/workflows/desktop-beta.yml` 在 beta 标签推送或手动运行时构建 Windows 安装包、验证元数据并创建 **draft prerelease**，不会公开发布。

在仓库 Settings → Secrets and variables → Actions 的 Variables 配置以下非秘密公开变量，值与生产环境一致：

- `NEXT_PUBLIC_APPWRITE_ENDPOINT`
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID`

构建不需要云端管理密钥、测试账户密码或登录 Cookie，禁止把 `.env.local` 上传到 CI。

如果采用代码签名，配置 Secrets `WINDOWS_CSC_LINK`、`WINDOWS_CSC_KEY_PASSWORD`。未设置则准备未签名包。GitHub 上传使用工作流自带的 `github.token`，不把个人 token 放入应用。

草稿包括安装包、对应 `.blockmap`、`beta.yml`、`SHA256SUMS.txt` 和 `release-manifest.json`。流水线拒绝覆盖公开 Release 或其他提交的同版本草稿；正式版本必须使用新的版本号。

先审查并合并 PR，再运行工作流或推送匹配 `package.json` 的 `v2.2.0-beta.1` 标签。审核草稿、签名状态、校验清单和说明后，再由用户确认公开为 Pre-release。客户端无法发现草稿；真实 GitHub 更新发现和下载仍须在公开发布后验证，不能用本机更新源的成功替代。

当前旧版 2.1.1 没有更新器，首次必须手动安装新 beta。公开 beta.1 后，beta.1 检查自身应报告无新版本；验证 GitHub 端到端升级需要后续公开的更新版本。
