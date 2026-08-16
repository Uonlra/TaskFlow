# TaskFlow 测试说明

## 测试工具

| 工具            | 用途                                            |
| --------------- | ----------------------------------------------- |
| Vitest          | 纯函数、Hook、Provider、Store 和 API Route 测试 |
| Testing Library | React 组件和 Context 交互测试                   |
| Playwright      | 浏览器端 Mock E2E、真实冒烟测试                 |
| V8 Coverage     | 统计语句、分支、函数和行覆盖率                  |
| GitHub Actions  | 在干净环境运行测试、类型检查、构建和 Mock E2E   |

## 测试分层

| 层级          | 文件                                                       | 覆盖内容                               |
| ------------- | ---------------------------------------------------------- | -------------------------------------- |
| 单元测试      | `src/features/tasks/utils/task-date-filters.test.ts`       | 日期解析、范围、边界                   |
| 单元测试      | `src/features/tasks/utils/task-analytics.test.ts`          | 任务统计、趋势、风险                   |
| 单元测试      | `src/features/tasks/utils/task-deadline.test.ts`           | 逾期、今天到期、排序                   |
| 单元测试      | `src/features/tasks/utils/task-tags.test.ts`               | 标签解析与格式化                       |
| 单元测试      | `src/features/auth/utils/workspace-state.test.ts`          | 工作区状态转换                         |
| Hook 测试     | `src/features/auth/hooks/use-auth-account-lookup.test.tsx` | 防抖、邮箱查询、请求状态和错误         |
| Provider 测试 | `src/features/auth/providers/auth-provider.test.tsx`       | 会话恢复、退出、资料刷新和保存         |
| Store 测试    | `src/features/tasks/store/task-store.test.ts`              | 同步、创建、编辑、状态更新、删除和错误 |
| 组件测试      | `src/features/tasks/components/task-form-dialog.test.tsx`  | 弹窗、表单校验、提交和关闭             |
| 组件测试      | `src/features/auth/components/login-form.test.tsx`         | 登录校验和接口错误                     |
| 组件测试      | `src/features/auth/components/register-form.test.tsx`      | 注册校验和接口错误                     |
| API Route     | `src/app/api/health/route.test.ts`                         | 健康检查响应契约                       |
| API Route     | `src/app/api/auth/lookup/route.test.ts`                    | 参数校验和账号状态响应                 |
| API Route     | `src/app/api/tasks/route.test.ts`                          | 鉴权、输入校验和任务创建               |
| Mock E2E      | `test/e2e/login.spec.ts`                                   | 登录表单校验、接口失败、密码显隐       |
| Mock E2E      | `test/e2e/auth-guard.spec.ts`                              | 未登录访问受保护页面                   |
| Mock E2E      | `test/e2e/task-create.spec.ts`                             | 创建任务前端流程（Mock API）           |
| 真实冒烟      | `test/e2e/taskflow-smoke.spec.ts`                          | 登录、创建、更新、删除真实链路         |

## 测试策略

- 纯函数业务规则（日期、排序、统计、状态）使用 Vitest。
- 依赖当前时间的函数使用 `vi.useFakeTimers()` 固定时间。
- 前端错误和边界状态使用 Playwright `page.route()` Mock 接口。
- React 组件使用 Testing Library 和 `user-event`，只验证用户可观察行为和组件回调。
- Hook 使用 `renderHook`、Provider、假定时器和 fetch Mock 验证异步状态转换。
- Zustand Store 直接通过 `getState()`、`setState()` 验证请求和状态变化，并在每条测试后重置单例状态。
- API Route 使用 `NextRequest` 验证鉴权、Zod 输入校验和 JSON 响应契约。
- 完整真实链路仅保留一条冒烟测试，使用环境变量注入账号，避免污染数据。
- 真实冒烟测试使用唯一任务标题并在结束时删除，避免残留。
- Vitest 只包含 `src/**/*.{test,spec}.{ts,tsx}`，避免误加载 Playwright 文件。
- 组件测试使用 `jsdom`，纯函数和 API Route 默认使用 Node 环境。

## 运行命令

```bash
pnpm test                                 # 单元测试
pnpm test:coverage                        # 运行测试并生成 V8 覆盖率
pnpm typecheck                            # TypeScript 类型检查
pnpm build                                 # Next.js 生产构建
pnpm test:e2e:mock                         # 运行不依赖真实 Appwrite 的 E2E
pnpm test:e2e                             # 全部 E2E
pnpm exec playwright test <file>          # 单个 E2E 文件
pnpm exec playwright test <file> --headed # 显示浏览器
```

## 环境变量

真实冒烟测试需要：

- `TASKFLOW_E2E_EMAIL`
- `TASKFLOW_E2E_PASSWORD`

未配置时冒烟测试自动跳过。

## 当前验证数据

最近一次本地验证结果：

| 检查              | 结果                         |
| ----------------- | ---------------------------- |
| Vitest            | 14 个测试文件，71 条测试通过 |
| Mock E2E          | 5 条测试通过                 |
| TypeScript        | `pnpm typecheck` 通过        |
| Production build  | `pnpm build` 通过            |
| Coverage provider | V8                           |

当前覆盖率统计范围包括 `src/app/api`、`src/features/auth` 和 `src/features/tasks`：

| 指标       |   结果 |
| ---------- | -----: |
| Statements | 40.85% |
| Branches   | 29.43% |
| Functions  | 42.81% |
| Lines      | 41.36% |

部分核心模块覆盖率：

| 文件                         | Statements |  Lines |
| ---------------------------- | ---------: | -----: |
| `task-store.ts`              |     93.18% | 96.96% |
| `use-auth-account-lookup.ts` |     80.64% | 83.33% |
| `auth-provider.tsx`          |     75.00% | 80.24% |
| `register-form.tsx`          |     70.68% | 71.42% |
| `src/app/api/tasks/route.ts` |     66.66% | 70.00% |

覆盖率用于定位风险和缺口，不作为单独的质量结论；当前没有设置强制覆盖率阈值。

## CI

`.github/workflows/ci.yml` 会在 push 和 pull request 时执行：

1. 使用 Node 22 和 pnpm 10.7.0 安装依赖。
2. 运行 `pnpm test`。
3. 运行 `pnpm typecheck`。
4. 运行 `pnpm build`。
5. 安装 Chromium 并运行 `pnpm test:e2e:mock`。
6. 上传 Playwright 报告 Artifact，保留 7 天。

CI 只运行 Mock E2E，不默认运行真实 Appwrite 冒烟测试，避免真实账号、外部服务和测试数据影响每次提交。

## 当前缺口

- 尚未为所有 API Route 补测试。
- 尚未为 Dashboard、Calendar、Stats 和任务工作台组件补组件测试。
- 尚未设置覆盖率阈值。
- 尚未补充性能和可访问性检查。
- 真实 Appwrite 冒烟测试尚未作为独立的手动 GitHub Actions workflow。

性能、可访问性、错误治理和更完整的 CI workflow 将在后续工程化阶段按风险补齐。
