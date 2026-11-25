# Windows beta 与正式版发布链

发布链支持 beta 与正式版两个通道。当前 package.json 版本为 `2.2.0-beta.3`，仅生成本地 Windows 候选安装包，没有创建新标签、草稿或公开发布。稳定版版本号、代码签名策略和公开发布时机仍需用户确认。

本地候选目录为 `dist/candidates/v2.2.0-beta.3`。校验清单中的 `sourceDirty` 会标明校验时是否存在未提交改动；本地候选不能直接作为干净提交的 CI 发布证明。

## 通道规则

| package.json 版本形式 | 通道文件     | GitHub 发布类型      | 允许发现预发布 |
| --------------------- | ------------ | -------------------- | -------------- |
| `x.y.z-beta.n`        | `beta.yml`   | draft prerelease     | 是             |
| `x.y.z`               | `latest.yml` | draft，非 prerelease | 否             |

只接受规范的数字版本，不接受 alpha、rc、构建元数据或数字前导零。标签必须严格等于 `v${version}`。不生成其他通道的元数据，不重用已公开标签或替换公开 Release。

`scripts/lib/desktop-release-policy.cjs` 是构建配置、工作流预检和校验脚本共用的通道规则。`electron-builder.config.cjs` 在构建时按实际 package.json 版本覆盖 `publish.channel`，并固定 `releaseType: draft`、`generateUpdatesFilesForAllChannels: false`。package.json 中当前 beta 构建配置的默认值不再决定正式版本的构建通道。

必须使用以下入口构建，使动态配置生效：

```powershell
pnpm desktop:pack
pnpm desktop:dist
pnpm desktop:verify-release
pnpm test:desktop-release
```

直接运行无配置参数的 electron-builder 会绕过动态通道配置，不属于发布入口。将来切换通道时应使用新的输出目录或清理专用构建输出，避免上一个通道的文件混入；校验脚本会拒绝混入的 `beta.yml` 或 `latest.yml`。

## GitHub 工作流

为保留已有入口，文件仍为 `.github/workflows/desktop-beta.yml`，名称更新为 **Windows desktop release draft**。支持 `v*` 标签和手动运行：

1. 完整 checkout 后，在安装依赖前运行 `scripts/prepare-desktop-release.mjs`，检查规范版本、标签一致、标签指向当前提交、公开 Appwrite 构建变量及对应发布说明。手动运行必须选择与目标标签相同提交的 ref。
2. 运行更新器、发布链测试及类型检查，构建 Windows x64 安装包。
3. 校验安装包、ASAR 内容边界、GitHub 配置、对应通道文件、SHA-512 和 blockmap，生成 SHA-256 与发布清单。
4. 上传 `taskflow-windows-beta` 或 `taskflow-windows-latest` artifact。附件始终是安装包、blockmap、当前通道 YAML、`SHA256SUMS.txt`、`release-manifest.json` 共 5 个。
5. 仅创建草稿。beta 添加 `--prerelease`；正式版本不添加该标记。已有草稿必须仍为 draft、指向相同提交且发布类型一致，否则拒绝替换。

源码和 GitHub 工作流不会执行公开发布。用户审查草稿后再确认并手动公开；正式版本公开时应确认它作为 GitHub 的最新正式版本，因为稳定版客户端通过 `/releases/latest` 发现版本。

## 公开后验证

```powershell
# 当前公开 beta
pnpm desktop:verify-published --version=2.2.0-beta.2 --download
# 仅在用户批准并真正公开对应正式版后使用，例如：
pnpm desktop:verify-published --version=2.2.0 --download
```

公开校验脚本按目标版本检查 prerelease 标记、通道、5 个附件、标签提交、清单及实际 GitHubProvider 的版本发现。目标必须是当前通道的最新版本；尚未发布的正式版返回失败，不会因此创建版本或上传文件。

beta 客户端迁移到正式版时，electron-updater 可以在正式发布缺少 `beta.yml` 时回退读取 `latest.yml`；正式版客户端设置 `allowPrerelease: false`，不会因更新的 beta 出现在 Atom feed 中就下载 beta。本次使用实际安装依赖的 GitHubProvider 和离线模拟响应测试这两种行为，没有修改签名验证器。

## 验证边界及下一步

发布链测试实际执行两种通道的产物校验脚本、模拟 Git 标签预检、拒绝错误发布状态与通道混用，并检查 GitHubProvider 行为。测试用的正式版版本号和产物位于临时目录，不改项目版本，也不执行安装。

`pnpm desktop:smoke:manual-upgrade dist/candidates/v2.2.0-beta.3` 使用已保存且校验 SHA-256 的公开 beta.2 安装包，以及候选目录中的新版完整运行文件，制作具有独立安装身份的临时 NSIS 安装包并执行覆盖升级。它不改写程序 ASAR，使用独立测试资料目录与模拟云端，验收后卸载临时安装。默认旧包路径为 `dist/github-beta2-run-42224896411/files/TaskFlow-Setup-2.2.0-beta.2-win-x64.exe`；可通过第二个参数指定相同哈希的旧包。报告和截图位于 `dist/manual-upgrade-acceptance/run-*/`。本次完整通过，详见[验收记录](desktop-manual-upgrade-acceptance.md)。

正式版尚未发布，不能将本地隔离测试描述为真实 GitHub beta.2 → 正式版自动更新已通过。后续发布应先提交代码并完成审查，再由干净提交构建草稿，经用户确认公开后补做真实 GitHub 更新验证。稳定版仍需先确定版本号和签名策略。
