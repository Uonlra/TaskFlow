# TaskFlow 测试说明

## 测试工具

| 工具 | 用途 |
| --- | --- |
| Vitest | 纯函数与业务逻辑单元测试 |
| Playwright | 浏览器端用户流程 E2E 测试 |

## 测试分层

| 层级 | 文件 | 覆盖内容 |
| --- | --- | --- |
| 单元测试 | `src/features/tasks/utils/task-date-filters.test.ts` | 日期解析、范围、边界 |
| 单元测试 | `src/features/tasks/utils/task-analytics.test.ts` | 任务统计、趋势、风险 |
| 单元测试 | `src/features/tasks/utils/task-deadline.test.ts` | 逾期、今天到期、排序 |
| 单元测试 | `src/features/tasks/utils/task-tags.test.ts` | 标签解析与格式化 |
| 单元测试 | `src/features/auth/utils/workspace-state.test.ts` | 工作区状态转换 |
| Mock E2E | `test/e2e/login.spec.ts` | 登录表单校验、接口失败、密码显隐 |
| Mock E2E | `test/e2e/auth-guard.spec.ts` | 未登录访问受保护页面 |
| Mock E2E | `test/e2e/task-create.spec.ts` | 创建任务前端流程（Mock API） |
| 真实冒烟 | `test/e2e/taskflow-smoke.spec.ts` | 登录、创建、更新、删除真实链路 |

## 测试策略

- 纯函数业务规则（日期、排序、统计、状态）使用 Vitest。
- 依赖当前时间的函数使用 `vi.useFakeTimers()` 固定时间。
- 前端错误和边界状态使用 Playwright `page.route()` Mock 接口。
- 完整真实链路仅保留一条冒烟测试，使用环境变量注入账号，避免污染数据。
- 真实冒烟测试使用唯一任务标题并在结束时删除，避免残留。

## 运行命令

```bash
pnpm test                                 # 单元测试
pnpm test:e2e                             # 全部 E2E
pnpm exec playwright test <file>          # 单个 E2E 文件
pnpm exec playwright test <file> --headed # 显示浏览器
```

## 环境变量

真实冒烟测试需要：

- `TASKFLOW_E2E_EMAIL`
- `TASKFLOW_E2E_PASSWORD`

未配置时冒烟测试自动跳过。

## 当前缺口

- 尚未使用 Testing Library 进行组件测试。
- 尚未接入 GitHub Actions CI。
- 尚未配置覆盖率报告。
- 尚未补充性能和可访问性检查。

这些将在后续 12 周工程化阶段补齐。