# Windows beta.2 → beta.3 手动同步升级验收

验收日期：2026-11-25。范围为本地候选安装、加密数据恢复和模拟云端同步；尚未进行生产部署或 GitHub 自动更新验收。

## 候选安装包

- 版本：`2.2.0-beta.3`。
- 文件：`dist/candidates/v2.2.0-beta.3/TaskFlow-Setup-2.2.0-beta.3-win-x64.exe`。
- SHA-256：`33bd0909408f636ebec0ceacb6f79950fed20ce4427624da14f96a0cd0019620`。
- 发布校验：beta 通道、版本、GitHub 更新配置、ASAR 文件边界、SHA-512、blockmap 和 SHA-256 清单通过。
- 构建沿用未签名 beta 配置，清单标记 `sourceDirty: true`。后续发布应从已提交的干净代码重新构建。

## 验收方式

使用已保存的公开 beta.2 安装包，核对 SHA-256：`e2053666de4d5d9b923fa87198df10868821133a499c74c8b35edd9f88aa5fd3`。从中提取完整旧版运行文件，与候选目录中的完整新版运行文件分别制作独立身份的临时 NSIS 安装包，再覆盖安装到同一个测试目录。

程序 ASAR 与依赖保持原样，安装后再次核对 ASAR 哈希。只改变测试安装身份和可执行文件名称，使用显式的独立资料目录；不操作日常安装及用户数据。临时安装验收结束后卸载，保留报告、截图及测试资料。

应用自动检查软件更新在测试中关闭；所有应用 HTTP 请求由模拟云端接管，并配置不可用的网络代理兜底。测试不请求生产 Vercel 或 Appwrite，不验证真实账户的会话有效性。

```powershell
pnpm desktop:verify-release dist/candidates/v2.2.0-beta.3
pnpm desktop:smoke:manual-upgrade dist/candidates/v2.2.0-beta.3
```

第二个位置参数可指定相同哈希的旧版安装包。若仅调整验收脚本，可添加 `--resume=<已有运行时间戳>`，复用配置一致的测试安装包；旧测试资料会保留为备份，随后用全新资料重新执行升级。每次结果以新生成的 `report.json` 为准。

## 当前结果

完整运行通过。报告：[`report.json`](../dist/manual-upgrade-acceptance/run-1795607807450/report.json)，其中 `passed: true`、`testInstallationRemaining: false`。

| 检查                                                          | 结果 |
| ------------------------------------------------------------- | ---- |
| 从真实 beta.2 创建任务、加密身份、已连接工作区与待同步队列    | 通过 |
| 覆盖安装 beta.3，数据库、密钥、Local State 与身份文件保持一致 | 通过 |
| 新版恢复旧任务、身份、云端连接和原队列操作 ID                 | 通过 |
| 页面重载、模拟联网恢复与闲置 120 秒，未出现 HTTP 请求         | 通过 |
| 点击一次“立即同步”，恰好一次 POST 上传和一次 GET 下载         | 通过 |
| 模拟云端 503，等待 5 秒没有自动重试，保留新增探索与队列       | 通过 |
| 云端不可用时冷启动，恢复探索历史和同一待同步操作              | 通过 |
| 默认卸载移除临时程序，测试资料文件哈希保持一致                | 通过 |

截图：[`手动同步失败`](../dist/manual-upgrade-acceptance/run-1795607807450/manual-sync-failure.png)、[`冷启动恢复演进记录`](../dist/manual-upgrade-acceptance/run-1795607807450/upgraded-evolution.png)。运行产物位于被 Git 忽略的 `dist` 目录，不随源码提交。

配套检查已通过：发布链 9 项、更新器 4 项、托盘 4 项，以及修改脚本的静态检查。

## 后续发布

本次没有提交代码、推送分支、创建标签、发布 GitHub Release 或部署 Vercel。需要在代码提交审查后，从干净提交构建发布草稿；公开后再验证真实 GitHub 版本发现、下载和更新。当前 Vercel 已累计的配额用量不会被新安装包清除。
