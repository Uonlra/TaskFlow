# U's TaskFlow

一个面向个人日程与任务推进的蓝白任务工作台。它把任务管理、截止风险、标签组织、进度趋势和个人资料整合到同一个前端项目里，适合作为个人作品集中的主项目继续打磨。

## 项目网页
https://www.uon1ra.top/article/taskflow

## 在线地址

- 生产部署：[https://fronted-flame-five.vercel.app/](https://fronted-flame-five.vercel.app/)

说明：

- 当前项目已经成功部署到 Vercel。
- 如果你还没有在 Vercel 项目设置里补上 Supabase 环境变量，线上站点会以演示模式运行。
- 本地 `.env.local` 已接入真实 Supabase；线上若要使用真实认证和真实任务数据，需要在 Vercel 项目中同步配置相同环境变量。

## 项目亮点

- 蓝白轻量任务工作台风格，兼顾清晰、轻盈和数据感
- Next.js App Router 架构
- Supabase Auth + Profiles + Tasks 的真实数据链路
- Dashboard 支持 URL 同步时间范围
- Tasks 页面支持 URL 同步筛选条件
- 本地持久化与远程数据模式平滑切换
- 任务标签系统
- 到期、今天到期、逾期风险提示
- Dashboard 图表模块：完成趋势、状态分布、标签分布
- 任务详情页、设置页、登录注册页都已统一到同一套蓝白视觉语言

## 核心功能

### 认证与身份

- 注册 / 登录
- 个人资料编辑
- 头像地址与昵称展示
- 服务端鉴权保护 Dashboard 路由

### 任务系统

- 新建、编辑、删除任务
- 状态切换
- 优先级管理
- 标签系统
- 截止日期与风险提示
- 任务详情页

### 列表与筛选

- 搜索
- 标签筛选
- 状态筛选
- 优先级筛选
- 排序
- URL 参数同步

### Dashboard

- 概览统计卡片
- 即将到期提醒
- 进度概览
- 最近活动流
- 标签摘要
- 完成趋势图
- 状态分布图
- 标签分布图

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Supabase
- React Hook Form
- Zod
- Zustand
- Vercel

## 目录概览

```txt
src/
  app/
  components/
    auth/
    dashboard/
    layout/
    task/
  features/
    auth/
    tasks/
  lib/
    supabase/
  providers/
  store/
  mock/

docs/
  screenshots/

supabase/
  tasks.sql
```

## 本地启动


1. 安装依赖

```bash
corepack pnpm install
```

2. 启动开发环境

```bash
corepack pnpm dev
```

3. 打开浏览器

```txt
http://localhost:3000
```

如果 3000 被占用，Next.js 会自动切换到其他端口。

## 环境变量

在项目根目录创建 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase Project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=你的 Supabase Publishable Key
NEXT_PUBLIC_SITE_URL=你的线上可访问地址
```

说明：

- `NEXT_PUBLIC_SITE_URL` 建议填写你的线上可访问地址。
- 这样注册邮件中的确认链接会回到线上站点，而不是依赖本地 `localhost`。
- 如果你本地关掉了 `corepack pnpm dev`，邮箱确认仍然可以通过线上地址完成。

## Supabase Auth URL 配置

为了让邮箱确认在本地关闭时也能工作，建议在 Supabase 后台一并设置：

1. 打开 `Authentication`
2. 进入 `URL Configuration`
3. 将 `Site URL` 设置为你的线上地址
4. 在 `Redirect URLs` 中加入：
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3001/auth/callback`
   - `https://fronted-flame-five.vercel.app/auth/callback`

这样无论你是在本地还是线上注册，邮件链接都会有稳定的回调地址。

## Supabase 初始化

1. 打开 Supabase Dashboard
2. 进入当前项目
3. 打开 `SQL Editor`
4. 新建查询
5. 执行 `supabase/tasks.sql`

这份 SQL 会创建或补齐：

- `profiles` 表
- `tasks` 表
- `tags` 字段
- `updated_at`
- `completed_at`
- RLS policy
- 用户注册后自动创建 profile 的 trigger
- 任务更新时间 trigger

## Vercel 部署

如果你要让线上站点接入真实 Supabase，而不是演示模式，请到 Vercel 项目中补环境变量：

1. 打开 Vercel 项目 `fronted`
2. 进入 `Settings`
3. 进入 `Environment Variables`
4. 添加：

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_SITE_URL=...
```

5. 重新触发部署

## 当前适合作为作品展示的页面

- `/login`
- `/dashboard`
- `/tasks`
- `/tasks/[id]`
- `/settings`

## 下一步路线

- 给任务系统增加子任务与备注
- 给 Dashboard 增加更细的时间筛选与导出能力
- 上传头像而不只是填 URL
- 补 README 中的技术架构图和数据流图
- 增加 Vercel 环境变量后的线上真实联调说明
