# U's TaskFlow

一个面向个人日程与任务推进的蓝白任务工作台。当前版本已经完成从 Supabase 到 Appwrite 的迁移，认证、资料和任务链路都可以在真实 Appwrite 项目上跑通，同时保留了未配置后端时的本地演示模式。

## 在线地址

- 生产部署：[https://fronted-flame-five.vercel.app/](https://raskflow.vercel.app/)
- 项目文章：[https://www.uon1ra.top/article/taskflow](https://www.uon1ra.top/article/taskflow)

说明：

- 如果线上环境变量未配置完整，站点会回退到本地演示数据模式。
- 本地 `.env.local` 配好 Appwrite 后，可以直接联调真实认证与真实任务数据。

## 当前能力

- Next.js App Router 架构
- Appwrite Auth + Tasks 真实数据链路
- Dashboard 时间范围与 URL 同步
- Tasks 搜索 / 标签 / 状态 / 优先级 / 排序与 URL 同步
- 本地演示模式与远程真实数据模式平滑切换
- 任务详情页、设置页、登录注册页共用统一视觉语言
- 到期、今天到期、逾期风险提示
- Dashboard 图表：完成趋势、状态分布、标签分布

## 真实数据架构

当前版本的关键边界如下：

- 浏览器只调用本站 `Next.js API`
- `Next.js API` 再调用 Appwrite Cloud
- 登录态通过站点自己的 `httpOnly` cookie 保持
- `profile` 使用 Appwrite `Account.name + prefs.avatarUrl`
- `tasks` 使用 Appwrite table + row-level permissions
- 未配置 Appwrite 时，任务仍由 Zustand + localStorage 支持 demo 模式

主要链路文件：

- 认证 API：
  [src/app/api/auth/login/route.ts](/D:/Studys/Projects/fronted/src/app/api/auth/login/route.ts)
  [src/app/api/auth/register/route.ts](/D:/Studys/Projects/fronted/src/app/api/auth/register/route.ts)
  [src/app/api/auth/logout/route.ts](/D:/Studys/Projects/fronted/src/app/api/auth/logout/route.ts)
  [src/app/api/auth/me/route.ts](/D:/Studys/Projects/fronted/src/app/api/auth/me/route.ts)
- 资料 API：
  [src/app/api/profile/route.ts](/D:/Studys/Projects/fronted/src/app/api/profile/route.ts)
- 任务 API：
  [src/app/api/tasks/route.ts](/D:/Studys/Projects/fronted/src/app/api/tasks/route.ts)
  [src/app/api/tasks/[id]/route.ts](/D:/Studys/Projects/fronted/src/app/api/tasks/[id]/route.ts)
- Appwrite 适配层：
  [src/lib/appwrite/env.ts](/D:/Studys/Projects/fronted/src/lib/appwrite/env.ts)
  [src/lib/appwrite/server.ts](/D:/Studys/Projects/fronted/src/lib/appwrite/server.ts)
  [src/lib/appwrite/session.ts](/D:/Studys/Projects/fronted/src/lib/appwrite/session.ts)
  [src/lib/appwrite/tasks.ts](/D:/Studys/Projects/fronted/src/lib/appwrite/tasks.ts)

## 页面清单

- `/login`
- `/register`
- `/dashboard`
- `/tasks`
- `/tasks/[id]`
- `/settings`

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Appwrite
- React Hook Form
- Zod
- Zustand
- Vercel

## 目录概览

```txt
src/
  app/
    api/
  components/
    auth/
    dashboard/
    layout/
    settings/
    task/
  features/
    auth/
    tasks/
  lib/
    appwrite/
  mock/
  providers/
  store/

docs/
  appwrite-setup.md
```

## 本地启动

1. 安装依赖

```bash
corepack pnpm install
```

2. 配置 `.env.local`

```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=你的 Appwrite Endpoint
NEXT_PUBLIC_APPWRITE_PROJECT_ID=你的 Appwrite Project ID
APPWRITE_API_KEY=你的 Appwrite API Key
APPWRITE_DATABASE_ID=你的 Appwrite Database ID
APPWRITE_TASKS_TABLE_ID=你的 Appwrite Tasks Table ID
APPWRITE_SESSION_COOKIE_NAME=taskflow-session
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

3. 启动开发环境

```bash
corepack pnpm dev
```

4. 打开浏览器

```txt
http://localhost:3000
```

## Appwrite 配置

你至少需要完成这些配置：

1. 创建 Appwrite Project
2. 添加本地与线上 Web Platform
3. 开启邮箱密码认证
4. 创建 Database
5. 创建 `tasks` table
6. 打开 `Row security`
7. 配置 API key

更具体的字段与权限配置请看  
[docs/appwrite-setup.md](/D:/Studys/Projects/fronted/docs/appwrite-setup.md)

## 当前联调结果

这次迁移已经在本地对真实 Appwrite 项目完成一轮 smoke test，验证通过的链路包括：

- 未登录访问 `/api/auth/me` 返回 `401`
- 未登录访问 `/dashboard` 重定向到 `/login`
- 真实账号登录
- 资料更新
- 任务创建
- 任务列表读取
- 任务状态更新
- 任务删除

## Vercel 部署

如果你要让线上版本接入真实 Appwrite，请在 Vercel 项目中补上这些环境变量：

```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=...
NEXT_PUBLIC_APPWRITE_PROJECT_ID=...
APPWRITE_API_KEY=...
APPWRITE_DATABASE_ID=...
APPWRITE_TASKS_TABLE_ID=...
APPWRITE_SESSION_COOKIE_NAME=taskflow-session
NEXT_PUBLIC_SITE_URL=...
```

然后重新触发部署。

## 后续可继续打磨

- 给任务系统增加子任务与备注
- 给 Dashboard 增加更细的时间筛选与导出能力
- 上传头像而不只是填 URL
- 给 README 增加架构图和数据流图
- 整理 Appwrite `tasks` table，去掉为旧 schema 兼容而保留的冗余字段
