# 桌面真实云同步验收（2026-11-05）

## 结论

初次生产验收发现“云端删除未传回桌面”。PR #119 已合并为 `a1a09741a0ab2b6d355637ac56e6b3e4812f842f`，Vercel 部署及主线 CI 均成功。连接生产 API 的桌面程序已通过真实功能验收，包括 105 条任务分页与删除冲突；本轮 107 条测试记录清理后，经生产同步接口独立复核，无残留。尚未发布新版本，自动更新和真实跨账户验收仍待完成。

环境：当前 Windows x64 打包程序、应用版本 2.1.1、Electron 45.1.0、本地页面 `app://taskflow`、生产 API `https://www.uta4k.top`。测试使用专用账户和隔离的 Electron 数据目录；另一独立 Cookie 会话模拟另一台设备，不模拟云端 API 响应。

## 已通过

- 独立会话及桌面实际登录表单登录成功；本地页面可以通过真实跨域 Cookie 读取当前身份。
- 仅登录不上传本地任务，设置中主动开启同步后上传并确认队列。
- 断网修改、关闭程序、断网冷启动，恢复加密身份、本地修改和原待同步操作；联网重启自动回放队列，真实 Cookie 会话仍有效。
- 重复发送同一同步操作，不生成重复任务。
- 独立会话创建云端任务后，桌面拉取到本地。
- 较新的云端修改覆盖较早的离线修改；后续较新的本地修改可以上传。
- 暂停同步后仍可本地编辑，恢复同步后回放队列。
- 桌面删除任务可以同步删除云端任务。
- 同步 API 拒绝账户标识与当前登录身份不一致的操作（403）。
- 退出登录保留本地任务，并使桌面真实云会话失效（401）；重新登录、主动开启同步后恢复原工作区。

## 初次生产验收失败记录：云端删除没有传回桌面

复现过程：

1. 独立会话在云端创建本轮专用任务，确认桌面已下载。
2. 桌面退出、重新登录并开启同步，确认仍能读取该任务。
3. 独立会话删除云端任务，GET 确认云端不存在。
4. 桌面触发联网同步事件，等待 40 秒（覆盖当前 30 秒周期同步），本地仍返回该任务。

当时桌面导入只执行 upsert，远程删除接口直接删除记录，未传递删除时间。旧 `listTasks` 只请求一次 rows，也不能靠某页缺少 ID 推断删除。

用户确认优先修复完整云同步后，已增加 `deletedAt` 删除记录、游标分页与本地删除标记导入。普通列表、总览、日历和统计查询隐藏删除记录，普通详情返回 404，只有认证同步下载读取删除历史。较新删除压过旧离线编辑，较新完整编辑可恢复任务，旧删除不会覆盖新版本。不会根据列表缺项删除本地任务。

## 修复后的真实候选验收

- Appwrite 已新增可选 datetime 字段 `deletedAt`，与 `syncClientUpdatedAt` 均为 available；旧行无需回填。
- 候选 API：`http://127.0.0.1:3000`；候选程序：`dist/sync-candidate/win-unpacked/TaskFlow.exe`。API 使用真实 Appwrite 数据和权限，未模拟云响应。
- 真实 105 条批量任务的普通列表导出、桌面分页下载完整。报告 `dist/electron/cloud-smoke-1793862016963/report.json` 中功能步骤通过；初次清理脚本失败，已通过独立清理工具恢复本轮标记清单并清理全部 107 条测试记录，报告的 `cleanup.remainingTaskIds` 已为空。原始失败状态保留，不改写为成功。
- 最终完整回归报告：`dist/electron/cloud-smoke-1793862451883/report.json`，`passed: true`，测试记录清理完成。包含本页全部基础场景及较早离线编辑与较新删除冲突、较新编辑恢复、旧删除重放。
- 286 项单元/组件测试、5 项原生 SQLite 测试、6 项模拟端到端测试及打包程序模拟同步验收通过；Web 生产构建、桌面静态导出、类型检查和 lint 通过（19 条现有警告）；Next dev 编译和运行错误检查为空。

本机候选复测示例（需先以相同 API 地址构建桌面资源并打包）：

```powershell
$env:NEXT_PUBLIC_API_BASE_URL='http://127.0.0.1:3000'
pnpm desktop:web-build
# 使用 electron-builder 生成候选程序后运行：
$env:TASKFLOW_E2E_API_BASE_URL='http://127.0.0.1:3000'
$env:TASKFLOW_E2E_PURGE='1'
$env:TASKFLOW_E2E_BULK_COUNT='105'
node --env-file=.env.local scripts/smoke-desktop-cloud.mjs dist/sync-candidate/win-unpacked/TaskFlow.exe
```

`TASKFLOW_E2E_PURGE=1` 使用测试账户自身的会话和行权限，核验本轮 ID、完整标题和时间标记后物理清理测试记录；不扩大管理密钥权限。正常模式只通过任务 API 删除测试任务，在新协议下会留下删除记录。若清理中断，使用 `node --env-file=.env.local scripts/cleanup-desktop-cloud.mjs <验收目录>` 重试；只有清单损坏时才加 `--recover-manifest`，它按本轮唯一时间标记重建清单。

## 上线顺序及边界

以下部署和生产复测已于 2026-11-05 执行，结果见下节。正式安装包仍应遵循相同顺序，避免使用本机候选 API 地址。

1. 执行 `pnpm appwrite:ensure-task-sync-column`，确认两个字段 available。本机当前配置对应的 Appwrite 已完成此步骤。
2. 合并、部署新 API，再构建连接生产 API 的正式候选桌面程序。发布前移除上面三个验收环境变量和 `NEXT_PUBLIC_API_BASE_URL` 的本地覆盖。
3. 使用生产地址重跑 `pnpm desktop:smoke:cloud`，再推进测试版发布及自动更新。

删除记录暂不自动过期，防止长期离线设备用旧修改复活任务；后续清理策略需要另行确定。已经被旧 API 物理删除的历史记录无法补出删除时间，此修复覆盖新协议生效后的删除。现有内部桌面版本需要升级，旧客户端不会正确消费删除记录。生产已有删除记录后，不能直接回滚到不识别删除标记的旧 API，否则旧查询会重新显示这些记录。

## 合并后的生产验收（2026-11-05）

- PR #119 已手动合并；合并提交的 Vercel 状态成功，主线 CI 成功。生产认证 `GET /api/tasks/sync` 返回任务页及 `nextCursor`，证明新同步接口已生效。
- 使用合并后的源码重新静态导出并打包 `dist/production-candidate/win-unpacked/TaskFlow.exe`。资源检查没有 `http://127.0.0.1:3000`，实际 API 为 `https://www.uta4k.top`。程序版本仍为内部验收用 2.1.1；构建来源和文件哈希记录在 `dist/production-candidate/build-provenance.json`。
- 批量生产报告：`dist/electron/cloud-smoke-1793863426229/report.json`。16 项功能检查全部通过，包含 105 条任务分页；初次清理有 1 条待处理，随后使用限定本轮 ID 的清理工具完成。原始 `passed: false` 状态保留，未改写历史命令结果。
- 独立生产接口清理复核：`dist/electron/cloud-smoke-1793863426229/production-cleanup-audit.json`，核对全部 107 个本轮 ID，`remaining: 0`、`passed: true`。清理覆盖活动任务及删除记录，不影响账户原有任务。
- 最终小规模生产完整回归：`dist/electron/cloud-smoke-1793863752782/report.json`，`passed: true`，`cleanup.remainingTaskIds` 为空。该轮重验全部基础功能、删除冲突及恢复，并正常完成清理。

## 复测命令及数据清理

在本机 `.env.local` 配置 `TASKFLOW_E2E_EMAIL`、`TASKFLOW_E2E_PASSWORD`，然后运行：

```powershell
pnpm desktop:smoke:cloud
```

可通过 `node scripts/smoke-desktop-cloud.mjs <TaskFlow.exe 路径>` 指定候选程序。运行前请确认桌面静态资源与安装包对应待验证代码。

脚本会向生产服务创建带 `Desktop E2E <时间戳>` 标记的任务，清理时只删除本轮记录的 ID，且核验标题。不会清空账户已有任务。测试结束清除隔离桌面保存的身份，尝试退出测试会话；不记录密码、会话 Cookie 或完整身份响应。

- 第一轮基础链路报告：`dist/electron/cloud-smoke-1793859655053/report.json`，基础检查通过，任务清理完成。
- 补充云端删除检查后的报告：`dist/electron/cloud-smoke-1793859754593/report.json`，整体未通过，`cleanup.remainingTaskIds` 为空，云端验收任务全部清理完成。

脚本保留失败断言，以非零状态退出，不跳过删除缺陷来获得通过结果。仅有一个真实测试账户：跨真实账户切换及权限隔离仍需第二专用账户验证；现有模拟测试和真实账户不匹配拒绝检查不能替代这一项。此轮也不声称覆盖所有并发写入的原子性场景。
