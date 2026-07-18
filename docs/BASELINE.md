# BASELINE — TaskFlow（个人任务管理工作台）

> 核对日期：2026-07-18（Day3）  
> 简历源：`career-ops/cv.md`  
> 本文件位置：`career-ops/output/DailyBaseline/TaskFlow-BASELINE.md`  
> 仓库内已有草稿：`D:\Studys\Projects\fronted\docs\BASELINE.md`（今日实测后以本文为准同步理解）  
> 用途：第 0 周事实基线；**不表示** PostgreSQL / Fastify 迁移已完成

---

## 1. 仓库与分支

| 项 | 事实 |
| --- | --- |
| 本地路径 | `D:\Studys\Projects\fronted` |
| 远程仓库 | https://github.com/Uonlra/TaskFlow.git |
| 当前开发分支 | **`SecBranch`** |
| 当前 HEAD | `4406f50` — `Update README.md` |
| 与 `origin/SecBranch` | **一致**（同步） |
| GitHub 默认 / 生产分支 | **`main`**（`origin/HEAD -> origin/main`，`66bfef6`） |
| 分支关系 | 功能经 PR 合入 `main`；`SecBranch` 相对 merge-base 约多 1 个提交（README），`main` 多合并提交。**对外演示以 main / 线上为准** |
| 本地未提交 | `M next-env.d.ts`；`?? docs/BASELINE.md`（不影响今日 build/test 结论） |
| Vercel | 项目名 `fronted`（`.vercel/project.json`：`prj_UBkCW0iXi5tDpUymxs6W6Z23v1Fb`） |
| 线上地址 | **https://www.uta4k.top/**（今日 WebFetch 可达，可见登录/总览文案） |
| 项目文章 | https://www.uon1ra.top/article/taskflow |

**唯一主仓结论：** 简历 `github.com/Uonlra/TaskFlow` 与本地/远程一致。  
**可部署分支结论：** 生产跟 **`main`**；日常开发在 **`SecBranch`**，合并后上线。

---

## 2. 运行环境与命令

| 项 | 值 |
| --- | --- |
| 包管理声明 | `packageManager: pnpm@10.7.0`（同时存在 `pnpm-lock.yaml` 与 `package-lock.json`） |
| 本机实测 | 当前 shell **无 pnpm**；`corepack enable` 因权限失败；改用 **`npm.cmd run …`** 可跑通 |
| 框架 | Next.js **16.2.10**（App Router）+ React 19 + TypeScript 6 |
| 环境文件 | `.env.example` → 复制为 `.env.local` |
| 关键依赖 | Appwrite（自研 SDK 适配）、Zustand、RHF、Zod、ECharts、Vitest |

**标准命令（仓库根目录）：**

```bash
# 推荐（若已装 pnpm）
corepack enable
pnpm install
pnpm test
pnpm build
pnpm dev

# 本机 Day3 实测可用
npm.cmd run test
npm.cmd run build
npm.cmd run dev
```

**基线缺口：** `package.json` **无 `lint` / `typecheck` 独立脚本**。  
- typecheck 由 `next build` 内嵌 TypeScript 步骤完成  
- **不可写「lint 已通过」**（未配置 ESLint 脚本）

---

## 3. 今日校验结果（已实测）

| 命令 | 结果 | 备注 |
| --- | --- | --- |
| `npm.cmd run test` | **通过** | Vitest：1 file / **17 tests** 全绿（`task-date-filters.test.ts`） |
| `npm.cmd run build` | **通过** | Next.js 16.2.10 Turbopack；TS 检查通过；21 条路由生成 |
| 线上 `https://www.uta4k.top/` | **可达** | 展示登录与总览引导文案 |
| lint | **未跑** | 无脚本，记为缺口 |

### Build 路由快照（与简历功能对齐）

| 路由 | 说明 |
| --- | --- |
| `/` | 入口 |
| `/login` `/register` | 认证 |
| `/dashboard` `/tasks` `/tasks/[id]` `/calendar` `/stats` `/settings` | 工作台 |
| `/demo` | **公开演示页（静态）** |
| `/api/auth/*` `/api/tasks` `/api/tasks/[id]` `/api/profile` `/api/health` | API Route |
| Middleware | 保护 `/dashboard` `/tasks` `/settings` 与 `/api/tasks` `/api/profile` |

---

## 4. TypeScript / strict

路径：`tsconfig.json`

| 选项 | 值 |
| --- | --- |
| `strict` | **`true`** |
| `allowJs` | **`false`** |
| `paths` | `@/*` → `./src/*` |

**结论：TS strict 已开启。** 简历写「通过 TypeScript strict 与生产构建校验」——**与今日 build 一致，可保留。**

---

## 5. 双模式运行（Appwrite / Demo）

### 5.1 开关逻辑（代码事实）

来源：`src/lib/appwrite/env.ts`、`src/store/task-store.ts`、`middleware.ts`

| 标志 | 条件 |
| --- | --- |
| `hasAppwritePublicEnv` | `NEXT_PUBLIC_APPWRITE_ENDPOINT` + `NEXT_PUBLIC_APPWRITE_PROJECT_ID` |
| `hasAppwriteAuthEnv` | 上者 + `APPWRITE_API_KEY` |
| `hasAppwriteDatabaseEnv` | 上者 + `APPWRITE_DATABASE_ID` + `APPWRITE_TASKS_TABLE_ID` |
| Session Cookie 名 | `APPWRITE_SESSION_COOKIE_NAME` 或默认 **`taskflow-session`** |

- **无独立 `DEMO_MODE` 开关。**  
- 公开 Appwrite 变量缺失 → Store 走 **localStorage / mock 初始任务**。  
- 独立演示路由：**`/demo`**。  
- Middleware：仅在 `hasAppwriteAuthEnv` 时强制登录；无 Appwrite 配置时放行（便于本地/演示）。

### 5.2 当前数据流（As-Is）

```text
浏览器（页面 / Zustand）
  → fetch 同源 Next.js API Route
  → 服务端 Appwrite SDK（API Key 不出浏览器）
  → Appwrite TablesDB（tasks 行级权限）
  → JSON 响应
  → UI loading / error / success

Session：Appwrite Session Secret → HttpOnly Cookie（taskflow-session）
无 Appwrite 公开配置：任务与资料落 localStorage + /demo 可预览
```

### 5.3 环境变量清单（`.env.example`）

```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=
NEXT_PUBLIC_APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
APPWRITE_DATABASE_ID=
APPWRITE_TASKS_TABLE_ID=
APPWRITE_SESSION_COOKIE_NAME=taskflow-session
NEXT_PUBLIC_SITE_URL=http://localhost:3000   # 线上须为 https://www.uta4k.top
```

---

## 6. 现有功能清单（已有 / 缺口）

### 6.1 已有（可演示、可写简历）

| 能力 | 证据 |
| --- | --- |
| 注册 / 登录 / 退出 / 当前用户 | `/api/auth/*`、登录页 |
| HttpOnly Cookie Session | middleware + env cookie 名 |
| 任务 CRUD | `/api/tasks`、`/api/tasks/[id]` |
| 表单 Zod | `taskSchema`：title / description / status / priority / tags / dueDate |
| Zustand 双模式 | `task-store.ts` |
| URL 筛选协议 | 简历与 README：query/tag/status/priority/due/risk/date/range/sort |
| 跨视图 | Dashboard / Stats / Calendar / Tasks |
| ECharts 统计 | 依赖 + stats 组件 |
| 截止风险 | analytics / deadline 工具 |
| 空态 / 响应式 | README + 近期 commits |
| Vitest 日期/范围工具测 | **17** 条 |
| 线上 Vercel | uta4k.top |

### 6.2 明确尚未具备（Gate 前勿写进简历）

| 能力 | 状态 |
| --- | --- |
| 自建 PostgreSQL / Prisma | **无** |
| Fastify 业务 API | **无** |
| DB Session + Argon2（自建） | **无**（当前是 Appwrite Session） |
| 资源归属自建校验测试 | 现为 Appwrite 行级权限 |
| Playwright E2E | **无** |
| CI（lint/typecheck/test/build） | **无完整 CI 叙述证据** |
| ESLint 脚本 | **无** |

---

## 7. 与简历一致性（`cv.md` § TaskFlow）

| 简历表述 | 结论 |
| --- | --- |
| 地址 `github.com/Uonlra/TaskFlow` | **一致** |
| Next.js / TS / Appwrite / Zustand / ECharts | **一致**（可补 RHF、Zod、Vitest） |
| API Route + httpOnly Cookie + middleware | **一致** |
| 双模式 Appwrite / localStorage | **一致** |
| URL 协议与跨视图 | **一致**（代码与 README 支撑） |
| Vitest + strict + 生产构建 | **一致**（今日实测） |
| 在线演示 | README 有 uta4k.top；**简历正文未写 URL** → 建议补一行（可选加强） |
| PostgreSQL / Fastify / 自建后端完成 | 简历**未写** → **正确** |

### 简历同步建议（轻量，非阻塞）

1. **建议补：** 项目下增加 `演示：https://www.uta4k.top/` 与 `/demo` 说明。  
2. **可选补技术栈：** `React Hook Form / Zod / Vitest / Vercel`。  
3. **不要写：** Fastify、PostgreSQL、Prisma、自建 Session、CI/E2E 已完成。  
4. **strict：** 可保留。

**同步结论：简历主表述与代码一致，可投；建议加上线链接。**

---

## 8. 迁移功能清单（BaaS → 自建，只列不实现）

> 原则：纵向切片 = 页面操作 → 校验 → API → PostgreSQL → UI 反馈 → ≥1 测试。  
> 禁止连续两周只有 Postman。

| 序号 | 切片 | Gate | 说明 |
| ---: | --- | --- | --- |
| 1 | **任务 list + create → PG 真读写** | **A-min 第 1 刀 / 第 1 周 P0** | 复用现有 Zod；浏览器可创建可见 |
| 2 | users 表 + seed（最小） | A-min | 为归属预留 `user_id`；鉴权可暂 mock/后置 |
| 3 | update / delete | A-min | 仍纵向到浏览器 |
| 4 | 筛选 + 分页 | A-min | 对齐现有 URL 协议字段子集 |
| 5 | loading / error / empty 与错误体一致 | A-min | |
| 6 | Prisma migrate + README ER | A-min | |
| 7 | 核心 API 测 8–12（成功/非法/约束） | A-min | |
| 8 | Argon2 + DB Session + Cookie | 第 3–4 周 | 替换 Appwrite 登录 |
| 9 | 仅本人任务 / 越权失败 | 第 3–4 周 | |
| 10 | 前端登录态与受保护页 | 第 3–4 周 | |
| 11 | Playwright 主路径 | A-full | 登录→创建→筛选→删除 |
| 12 | CI + 公网/预览稳定 | A-full | 最晚第 7–8 周 |
| — | Stats/D3 大升级 | Gate A 后 | 路线明确后置 |
| — | RedditLike 后端 / JWT 双实现 | 不做 | |

### 第一个切片字段契约（保持现有表单）

来自 `taskSchema` / `Task`：

- `title`（必填）  
- `description`（≥3 字符）  
- `status`: `todo` \| `in_progress` \| `done`  
- `priority`: `low` \| `medium` \| `high`  
- `tags`（可选字符串，服务端可拆数组）  
- `dueDate`（可选）  
- PG 侧增加：`id`、`user_id`、`created_at`、`updated_at` 等

### 第一个切片明确不做

- 鉴权重写、编辑删除筛选分页、看板/统计/日历重构、Demo 模式大改、UI 重写、第二套 CRUD。

---

## 9. 数据流草图

### 9.1 当前（As-Is）

```text
[浏览器 UI]
   |  RHF+Zod 校验
   v
[Zustand task-store] ----(无 Appwrite 公开 env)----> [localStorage / mock]
   | (有 Appwrite)
   v
[Next.js Route Handler /api/tasks*]
   |  读 HttpOnly session cookie
   v
[Appwrite API + TablesDB + 行级权限]
   |
   v
[JSON] -> UI 反馈
```

### 9.2 目标（To-Be，Gate A 方向）

```text
[浏览器任务页]
   |  校验（复用 Zod 契约）
   v
[Fastify API + TS]          ← 业务 CRUD 只在这里，不在 Next 再写一套
   |
   v
[Prisma]
   |
   v
[PostgreSQL: users / tasks / tags]
   |
   v
[API 响应] -> UI loading/error/success
   |
   v
[≥1 自动化测试：成功 / 非法输入 / 约束失败]
```

**约束：** Next.js 可继续做 BFF/页面；**不要**同时在 Route Handler 与 Fastify 维护两套任务 CRUD。

---

## 10. Gate 对照（路线 §5.2 / §7）

| Gate | 标准摘要 | 当前 |
| --- | --- | --- |
| 阶段零 | BASELINE + 可验证简历 | **本文完成** |
| A-min（约第 6 周） | 本地 CRUD/筛选 + 迁移 Seed + 核心测 + README；不强制在线自建后端 | **未开始**（仍 Appwrite） |
| A-full（≤8 周） | A-min + 公网/预览 + 演示说明 | 前端已有 uta4k.top（Appwrite 栈）；**自建栈未上** |
| B（12 周） | 鉴权归属 CI E2E 作品集 | **未开始** |

---

## 11. 当前唯一 P0（TaskFlow）

### P0（第 1 周起执行，本周只锁定）

> **完成一个由 Fastify + PostgreSQL 支撑、可在浏览器真实操作的「任务列表 + 创建任务」纵向切片。**

**验收标准：**

1. 浏览器能 **读取** 任务列表（来自 PG，非仅 mock）  
2. 浏览器能 **创建** 合法任务并立即在列表看到  
3. 非法输入有清晰错误（Zod/校验）  
4. 数据库约束失败被正确处理并反馈  
5. 至少 3 类测试：**成功 / 非法输入 / 约束失败**  
6. README 写清：如何起 PG、跑 migrate/seed、起 API、起前端  

**明确不做：** 鉴权重写、编辑删除、大 UI、Stats/D3、为迁移而停投递/停 F1。

---

## 12. 版本与部署一致结论

| 维度 | 结论 |
| --- | --- |
| 本地 SecBranch ↔ origin/SecBranch | **一致** `4406f50` |
| 生产 / 简历可指地址 | **https://www.uta4k.top/** |
| 简历功能描述 ↔ 代码 | **一致** |
| 简历未宣称自建 PG | **正确** |
| 双模式入口 | Appwrite 真链 + **`/demo`** + localStorage 回退 |
| 测试 / 构建 | **17 tests 绿 + build 绿** |

---

## 13. Day3 收尾清单

- [x] 确认主仓 / 分支 / 远程  
- [x] 确认可部署与线上 URL  
- [x] 确认 Appwrite 与 Demo 双模式入口  
- [x] 实测 test + build  
- [x] 对照简历一致性  
- [x] 迁移清单（8–12 项级）  
- [x] 当前 / 目标数据流  
- [x] 锁定唯一 P0 = list+create → PG  
- [ ] （可选）`cv.md` 补演示链接  
- [ ] （可选）把本文要点同步回仓库 `docs/BASELINE.md` 并提交  
- [ ] 第 1 周开始实现 P0  

---

## 14. 一句话状态

> TaskFlow 主仓在 `D:\Studys\Projects\fronted` 的 `SecBranch`，**strict + 17 测 + build 全绿**，线上 **uta4k.top** 可达；双模式为 **Appwrite 真数据 + `/demo`/localStorage**。简历与代码一致且未冒充自建后端。唯一 P0：**Fastify + PostgreSQL 支撑的任务列表与创建纵向切片（浏览器真读写 + 3 类测试）**。
