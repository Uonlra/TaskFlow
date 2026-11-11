# 任务演进持久化与同步

## 当前交付

任务的可选 `evolution` 字段保存一个完整的、有版本号的演进数据。目标、状态、分支、成果和历史按一个任务整体提交；未开始探索的旧任务不补造历史。第一次提交演进命令时，才在同一次保存中建立初始快照。

- 浏览器访客模式：沿用现有 `sessionStorage` 临时保存规则。写入失败时不提交内存中的新状态；刷新可以恢复，关闭标签页后的永久保存不在访客模式承诺内。
- 桌面模式：可重复执行的 SQLite 迁移新增 `evolution_json`。目标、状态、历史和同步队列在同一事务保存，数据库关闭后重新打开可以恢复。删除保留带历史的删除标记。
- 云端模式：新增认证接口 `POST /api/tasks/[id]/evolution`。仓储使用用户会话及行权限，绝不以管理员 Key 代替任务操作权限。
- 备份：没有演进的任务继续使用 v1；包含演进时导出 v2。导入先检查所有快照及历史一致性，再逐项保存；生成新任务 ID 并重映射初始节点，保留分支和成果引用。

任务详情已接入探索、提交结论、成果采纳操作及 Git 式演进图，见 [任务详情操作说明](./task-evolution-detail.md) 和 [演进图说明](./task-evolution-graph.md)。总览和日历速览已接入演进摘要与记录进展，见 [速览说明](./task-evolution-overview.md)。

## 保存与冲突

`executeEvolution(id, command)` 已接入远程仓储、桌面仓储和任务 Store。调用者生成并保留 `operationId`，重试时携带同一份命令。`expectedRevision` 不一致会返回冲突，不覆盖后续修改。

读入的演进数据经过结构校验和事件重放，确保任务 ID、分支引用、成果快照、目标版本及当前内容一致。损坏数据和不支持的版本会报错，不静默截断或丢弃历史。

普通编辑仍可修改说明、标签、优先级和日期。任务开始演进后，旧入口不能直接修改标题或状态，必须使用目标调整、完成验收或重新打开命令。其交互入口将在下一阶段补上。

## 云端部署前置步骤

本次未运行线上迁移，也未部署 API。发布前，在目标环境配置现有 Appwrite 环境变量，运行：

```powershell
pnpm appwrite:ensure-task-evolution
```

脚本先探测事务创建及回滚能力，再确认两个可选字段可用：

| 字段             | 类型                   | 用途                                   |
| ---------------- | ---------------------- | -------------------------------------- |
| `evolutionJson`  | string，容量 1,048,576 | 保存任务整体演进快照                   |
| `evolutionFence` | boolean                | 在事务中读取并修改前建立写冲突检测起点 |

脚本可重复执行，发现不兼容字段会停止，不删除或重建旧字段。部署必须先确认字段 available，再发布新 API；普通网页编辑和删除也使用新的事务流程。

云端提交先在事务中写入 fence，再读取已提交的当前行，避免把 fence 暂存写入的更新时间误当成另一次用户修改。随后在原事务中写入目标与历史并提交；从 fence 开始的外部行修改会触发提交冲突。校验失败或提交冲突会尝试回滚。提交成功但响应丢失时，可以用原命令安全重试。参考 [Appwrite 事务机制](https://appwrite.io/docs/products/databases/tablesdb/transactions)。

## 离线同步

桌面端仍按现有机制合并同一任务的待上传快照，但快照现在包括完整演进记录。云端只接受与已提交历史连续的扩展；发现两端各自产生不同历史时，保留本地队列并报告冲突，不以更新时间择一覆盖。

如果云端已完整包含本地命令，可以安全确认旧快照。离线新建、探索后再删除的任务也上传包含历史的删除快照。

同步确认和远端快照导入通过 `syncQueue.settle` 在同一 SQLite 事务中执行。导入失败时，确认也会回滚；同步期间产生的新编辑仍由剩余队列保护。旧桌面桥接缺少这一能力时，遇到演进数据会停止同步并提示更新应用。

## 容量与后续工作

当前采用单行整体保存，应用层限制每个任务的演进 JSON 为 1,000,000 UTF-8 字节，超过时明确拒绝保存，原记录保持完整。旧 string 字段按容量映射底层存储的依据见 [Appwrite 文本类型说明](https://appwrite.io/blog/post/new-string-types)。演进图已按每批 30 行渐进渲染，但数据仍一次读取完整快照；服务端游标分页及事件拆表属于后续容量工作。

仍需在目标 Appwrite 环境完成迁移和真实账户的双端离线同步验收；本次云端事务验证使用模拟存储，不能替代目标服务验收。

验证命令：

```powershell
pnpm test:desktop-evolution
pnpm exec vitest run src/app/api/tasks src/features/tasks src/shared/lib/appwrite/task-transaction.test.ts src/shared/lib/appwrite/tasks.test.ts
pnpm typecheck
pnpm lint
```

桌面领域运行时由 `pnpm desktop:evolution-build` 从同一份 TypeScript 源码生成；桌面构建会自动执行。不要手动编辑 `electron/generated/task-evolution.cjs`。
