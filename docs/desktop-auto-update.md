# GitHub Releases 自动更新与 beta 发布

当前已公开版本为 `2.2.0-beta.2`。使用 electron-updater 6.8.11、electron-builder 26.18.0 和 Windows NSIS。设置页的“应用更新”不要求登录云端账户。

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

2026-11-05 已通过 `dist/update-acceptance/run-1793864900068/report.json` 中的 6 项真实更新验收。测试入口最初依赖临时环境和外部配置，安装器重启曾出现主进程异常；已改为将回环更新地址和调试端口嵌入测试包元数据。NSIS 自动重启通过正常应用窗口验证；随后显式带调试参数重新打开升级后的程序，验证版本和加密存储。最终任务、完成状态、身份、暂停的工作区及待同步队列均保留，测试安装已卸载。正式包校验会拒绝测试入口和测试元数据。

早期 `2.2.0-beta.1` 的本地候选发布物位于 `dist/beta-release`，安装包为 `TaskFlow-Setup-2.2.0-beta.1-win-x64.exe`，签名状态 `NotSigned`。发布元数据、SHA-512、blockmap、SHA-256 和 ASAR 内容边界校验通过。该本地候选的 SHA-256 为 `abef55a9b606c1b1136068ecb1d46db7e72c8b8e0712ef2cbb064594459d0f05`，与后续 CI 重建产物不同，不应用于校验公开安装包。

2026-11-06 已公开 [v2.2.0-beta.1](https://github.com/Uonlra/TaskFlow/releases/tag/v2.2.0-beta.1)，由 [Actions 第二次运行](https://github.com/Uonlra/TaskFlow/actions/runs/42038849693) 构建，源码提交为 `ad8bb6557b51fe3d7610bfce53779b4bddebad00`。公开安装包 SHA-256 为 `ea89bbbfec159b912e64cc04b3f68fa157563077b3310b5263a6ac6524bc7c65`。5 个附件的匿名下载、SHA-256、beta.yml 中的 SHA-512，以及真实 GitHub Atom feed 的 beta 发现均已核对通过；本机报告位于 `dist/github-beta-public-2.2.0-beta.1/public-verification-report.json`。这不代表跨版本安装已通过。

同一份正式候选程序通过未登录离线 CRUD、全部页面加载及强制退出恢复（`dist/electron/local-smoke-1793867709643`）；连接生产 API 的 15 项真实云同步回归通过，测试任务清理完成（`dist/electron/cloud-smoke-1793867783478/report.json`）。288 项单元/组件测试、4 项更新策略测试、lint（19 条现有警告）、类型检查和桌面静态导出均通过。

同步、本地及安装验收脚本设置 `TASKFLOW_DISABLE_UPDATE_CHECK=1`，仅跳过主进程定时更新检查，不禁用手动更新能力。

## GitHub 草稿流水线

`.github/workflows/desktop-beta.yml` 在 beta 标签推送或手动运行时构建 Windows 安装包、验证元数据并创建 **draft prerelease**，不会公开发布。

在仓库 Settings → Secrets and variables → Actions 的 Variables 配置以下非秘密公开变量，值与生产环境一致：

- `NEXT_PUBLIC_APPWRITE_ENDPOINT`
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID`

构建不需要云端管理密钥、测试账户密码或登录 Cookie，禁止把 `.env.local` 上传到 CI。

如果采用代码签名，配置 Secrets `WINDOWS_CSC_LINK`、`WINDOWS_CSC_KEY_PASSWORD`。未设置则准备未签名包。GitHub 上传使用工作流自带的 `github.token`，不把个人 token 放入应用。

草稿包括安装包、对应 `.blockmap`、`beta.yml`、`SHA256SUMS.txt` 和 `release-manifest.json`。流水线拒绝覆盖公开 Release 或其他提交的同版本草稿；正式版本必须使用新的版本号。

先审查并合并 PR，再运行工作流或推送匹配 `package.json` 的新版本标签。不得移动或重用已公开的 `v2.2.0-beta.1` 和 `v2.2.0-beta.2`。审核草稿、签名状态、校验清单和说明后，再由用户确认公开为 Pre-release。客户端无法发现草稿；真实 GitHub 更新发现和下载仍须在公开发布后验证，不能用本机更新源的成功替代。

当前旧版 2.1.1 没有更新器，首次必须手动安装新 beta。beta.1 现可发现并升级到公开的 beta.2；beta.2 检查自身应报告无新版本。2026-11-08 已完成本机真实升级，范围及证据见 [GitHub 升级验收记录](./desktop-github-upgrade-acceptance.md)。

## 重复验证公开更新源

```powershell
# 元数据、匿名可访问性及真实 electron-updater GitHubProvider 发现检查
pnpm desktop:verify-published --version=2.2.0-beta.2
# Windows 完整下载与文件哈希检查（不安装）
pnpm desktop:verify-published --version=2.2.0-beta.2 --download
```

未指定版本时使用 package.json；候选版本尚未公开时会失败，这是预期行为。检查目标必须是当前 beta feed 指向的版本。脚本仅访问公开端点，不读取 `.env.local`、不需要 GitHub 凭据、不连接 Appwrite、不运行安装程序。报告保存到 `dist/published-verification/<版本>-<时间戳>/report.json`，失败也会写入原因。默认模式只下载元数据并检查附件 HTTP 状态和长度，不能代替完整文件哈希检查。

## beta.1 → beta.2 真实安装验收

建议使用独立 Windows x64 虚拟机或专用测试电脑，保留安装前快照。真实生产安装包使用相同应用标识，不能在日常工作区中仅靠 `--user-data-dir` 声称安装器、注册表和自动重启已隔离。

1. 审查合并 beta.2 PR 后，给合并提交创建新标签，等待草稿构建通过。用户确认公开后，在发布页保留 Pre-release 标记再发布。此步骤会让已有 beta.1 用户发现 beta.2。
2. 在测试 Windows 环境安装公开 beta.1 安装包。创建、编辑并完成本地任务，验证 JSON 导出；正常退出并重开，确认数据持久化。若测试云同步，使用专用账户，记录脱敏任务 ID、关闭同步并保留一条离线待同步操作；不要保存密码到报告。
3. beta.2 公开后运行 `pnpm desktop:verify-published --version=2.2.0-beta.2 --download`。从 beta.1 设置页检查更新，应显示 beta.2；手动下载后正常退出，重开仍应为 beta.1，任务保留。
4. 再次下载并确认重启安装，观察 NSIS 完成后自动打开正常窗口，不能有主进程 Error 弹窗。确认应用版本为 beta.2，任务正文、完成状态、工作区、云同步开关及待同步队列与升级前一致。启用同步后检查队列回放，清理测试任务。
5. 在 beta.2 再次检查更新，应提示当前为最新版本。离线重启并检查总览、任务、详情、日历、统计及设置可用。
6. 将 Windows 版本、安装包哈希、实际版本、各项结果和脱敏证据记录到报告；明确是否覆盖了云账户/待同步队列。全部完成后才能标记“真实 GitHub 跨版本升级通过”。失败时保留日志和数据，暂停后续发布，先定位原因。

当前进度：beta.2 已公开，公开源、完整文件下载及本机 beta.1 → beta.2 安装、自动重启、本地数据保留和模拟离线启动已通过。2026-11-08 用户另行确认云登录状态、非空待同步队列的升级保留及联网回放均已手测通过。自动与手测范围分开记录，详见 [GitHub 升级验收记录](./desktop-github-upgrade-acceptance.md)。
