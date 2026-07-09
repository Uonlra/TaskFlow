# Taskflow URL Filter Protocol

This document fixes the URL filter protocol for Taskflow cross-page navigation. It is a regression baseline for Dashboard, Calendar, Stats, Tasks, and future E2E work.

## Protocol Goals

The protocol is used for:

- Dashboard -> Tasks drill-downs.
- Dashboard -> Stats detail views.
- Calendar -> Tasks precise due-date filtering.
- Calendar local `date` / `range` state.
- Stats local `range` state.
- Future E2E checks and chart click-through validation.

The URL only describes the current display/filter state. It must not create, update, delete, or persist task data by itself.

## Global Rules

- URL params express client-side display filters only; backend data remains unchanged.
- Illegal params must be ignored or safely fall back. They should not crash the page.
- `date` uses `YYYY-MM-DD`.
- `date` uses local-date semantics, not UTC date shifting.
- `week` starts on Monday.
- On Tasks, `date` / `range` takes priority over `due`.
- `risk`, `priority`, `status`, `tag`, and `query` may be combined with `date` / `range`.
- Clearing filters on Tasks should return to `/tasks`.
- Do not place secrets, user ids, session data, or other sensitive information in URL params.

## Parameter Table

| Param | Legal Values | Default / Illegal Handling | Consumers | Typical Sources | Expected UI Feedback |
| --- | --- | --- | --- | --- | --- |
| `query` | Any string | Empty string; missing means no search filter | `/tasks` | Tasks search, future global search | `搜索：...` chip |
| `tag` | Any tag string | Empty string; missing means no tag filter | `/tasks` | Dashboard tag chart, Stats tag chart, Tasks filters | `标签：...` chip |
| `status` | `todo`, `in_progress`, `done` | Illegal value ignored; Tasks falls back to `all` | `/tasks` | Dashboard status chart, Stats status chart, Tasks filters, Calendar completed summary | `待开始`, `进行中`, or `已完成` chip |
| `priority` | `high`, `medium`, `low` | Illegal value ignored; Tasks falls back to `all` | `/tasks` | Dashboard priority chart, Stats priority chart, Calendar high-priority summary, Tasks filters | `高优先级`, `中优先级`, or `低优先级` chip |
| `sort` | `created_desc`, `updated_desc`, `due_asc`, `priority_desc` | Illegal value ignored; Tasks falls back to `due_asc` | `/tasks` | Tasks sorting controls | Sort chip only when not `due_asc` |
| `due` | `near`, `today`, `upcoming`, `overdue` | Illegal value ignored; missing means no due filter | `/tasks` | Dashboard deadline rail, Calendar quick links, Tasks category tabs | `临近截止`, `今天到期`, `即将到期`, or `已逾期` chip unless date/range is active |
| `risk` | `overdue`, `high`, `medium`, `low` | Illegal value ignored; missing means no risk filter | `/tasks` | Dashboard risk panel, Stats risk rows | `已逾期`, `高风险`, `中风险`, or `低风险` chip |
| `date` | `YYYY-MM-DD` | Illegal value ignored on Tasks; Calendar falls back to today | `/tasks`, `/calendar` | Calendar day/week/timeline links | `日期：YYYY-MM-DD` or `本周：MM/DD` chip on Tasks |
| `range` | `today`, `week`, `all` | Illegal value ignored on Tasks; Dashboard falls back to `today`; Stats/Calendar fall back to `week` | `/dashboard`, `/stats`, `/calendar`, `/tasks` | Dashboard range tabs, Stats range tabs, Calendar range tabs, Calendar -> Tasks links | `今天`, `本周`, or `全部日期` chip on Tasks; active tab on Dashboard/Stats/Calendar |

## Date And Range Rules

### `date`

- Format: `YYYY-MM-DD`.
- Invalid values are ignored on Tasks.
- Calendar invalid values fall back to the current local day.
- Example: `/tasks?date=2026-07-09`.
- On Tasks, `date` without `range` means exact due-date filtering for that local day.

### `range`

- Legal values: `today`, `week`, `all`.
- Invalid values are ignored or handled by page defaults.
- On Dashboard, `range` controls the overview scope.
- On Stats, `range` controls the analytics scope.
- On Calendar, `range` controls the calendar scope.
- On Tasks, `range` controls due-date range filtering.

### Combination Rules

| URL | Meaning |
| --- | --- |
| `/tasks?date=YYYY-MM-DD` | Show tasks due on that local date |
| `/tasks?date=YYYY-MM-DD&range=week` | Show tasks due in the Monday-start week containing that date |
| `/tasks?range=today` | Show tasks due today |
| `/tasks?range=week` | Show tasks due in the current Monday-start week |
| `/tasks?range=all` | Show tasks that have a valid `dueDate` |
| `/calendar?date=YYYY-MM-DD&range=week` | Select that date and show its week in Calendar |
| `/stats?range=week` | Show week analytics on Stats |
| `/dashboard?range=week` | Show week overview on Dashboard |

Tasks filter precedence:

- When any active `date` / `range` date filter exists, Tasks skips the `due` filter so the date protocol remains precise.
- `risk`, `priority`, `status`, `tag`, `query`, and `sort` still apply together with `date` / `range`.

## Entry Matrix

| Source Page | Module | Click Target | URL | Consumer | Expected Result |
| --- | --- | --- | --- | --- | --- |
| Dashboard | Hero action / empty CTA | Tasks | `/tasks` | `/tasks` | Open unfiltered task list |
| Dashboard | Focus rail high priority | High-priority tasks | `/tasks?priority=high` | `/tasks` | Shows high priority chip and filtered tasks |
| Dashboard | Deadline rail today | Today due tasks | `/tasks?due=today` | `/tasks` | Shows today due chip and filtered unfinished tasks |
| Dashboard | Deadline rail week/all | Upcoming tasks | `/tasks?due=upcoming` | `/tasks` | Shows upcoming chip and filtered unfinished tasks |
| Dashboard | Risk panel overdue | Overdue risk | `/tasks?risk=overdue` | `/tasks` | Shows overdue/risk chip and filtered tasks |
| Dashboard | Trend detail | Stats detail | `/stats?range=today`, `/stats?range=week`, or `/stats?range=all` | `/stats` | Stats opens with the same range active |
| Dashboard | Status distribution chart | Status tasks | `/tasks?status=todo`, `/tasks?status=in_progress`, or `/tasks?status=done` | `/tasks` | Shows matching status chip |
| Dashboard | Priority distribution chart | Priority tasks | `/tasks?priority=high`, `/tasks?priority=medium`, or `/tasks?priority=low` | `/tasks` | Shows matching priority chip |
| Dashboard | Tag Top 5 chart | Tagged tasks | `/tasks?tag=<tag>` | `/tasks` | Shows tag chip |
| Stats | Status distribution chart | Status tasks | `/tasks?status=...` | `/tasks` | Shows matching status chip |
| Stats | Priority distribution chart | Priority tasks | `/tasks?priority=...` | `/tasks` | Shows matching priority chip |
| Stats | Tag Top 5 chart | Tagged tasks | `/tasks?tag=...` | `/tasks` | Shows tag chip |
| Stats | Risk row | Risk tasks | `/tasks?risk=overdue`, `/tasks?risk=high`, `/tasks?risk=medium`, or `/tasks?risk=low` | `/tasks` | Shows risk chip |
| Calendar | Toolbar date link | Calendar same state | `/calendar?date=YYYY-MM-DD&range=<range>` | `/calendar` | Keeps selected date and range visible |
| Calendar | Week day cell | Calendar week view | `/calendar?date=YYYY-MM-DD&range=week` | `/calendar` | Selects date and shows week scope |
| Calendar | Week panel view tasks | Tasks week filter | `/tasks?date=YYYY-MM-DD&range=week` | `/tasks` | Shows `本周：MM/DD` chip and week due tasks |
| Calendar | Timeline filter | Tasks exact date filter | `/tasks?date=YYYY-MM-DD` | `/tasks` | Shows `日期：YYYY-MM-DD` chip and exact due-date tasks |
| Calendar | Timeline task row | Tasks exact task due date | `/tasks?date=<taskDueDate>` | `/tasks` | Shows tasks due on that task date |
| Calendar | Upcoming panel all range | Tasks all due-date filter | `/tasks?range=all` | `/tasks` | Shows `全部日期` chip and tasks with valid dueDate |
| Calendar | Upcoming panel week range | Tasks week filter | `/tasks?date=YYYY-MM-DD&range=week` | `/tasks` | Shows `本周：MM/DD` chip |
| Calendar | Upcoming panel today range | Tasks exact date filter | `/tasks?date=YYYY-MM-DD` | `/tasks` | Shows exact date chip |
| Calendar | Summary: 当日截止 | Tasks exact date filter | `/tasks?date=YYYY-MM-DD` | `/tasks` | Shows tasks due on selected date |
| Calendar | Summary: 本周到期 | Tasks week filter | `/tasks?date=YYYY-MM-DD&range=week` | `/tasks` | Shows tasks due in selected week |
| Calendar | Summary: 已逾期 | Overdue tasks | `/tasks?due=overdue` | `/tasks` | Shows overdue due chip |
| Calendar | Summary: 高优先级 current range | High priority in date scope | `/tasks?priority=high&date=YYYY-MM-DD`, `/tasks?priority=high&date=YYYY-MM-DD&range=week`, or `/tasks?priority=high&range=all` | `/tasks` | Combines priority and date/range filters |
| Calendar | Summary: 已完成 current range | Done tasks in date scope | `/tasks?status=done&date=YYYY-MM-DD`, `/tasks?status=done&date=YYYY-MM-DD&range=week`, or `/tasks?status=done&range=all` | `/tasks` | Combines status and date/range filters |
| Calendar | Quick links | Due / priority filters | `/tasks?due=today`, `/tasks?due=overdue`, `/tasks?due=upcoming`, `/tasks?priority=high` | `/tasks` | Shows the matching filter chip |

## Consumer Matrix

| Page | Params | Behavior | Empty State | Illegal Handling |
| --- | --- | --- | --- | --- |
| `/tasks` | `query`, `tag`, `status`, `priority`, `sort`, `due`, `risk`, `date`, `range` | Parses URL into `TaskFilters`, filters in display layer, syncs manual filter changes back to URL | Existing task empty state; active URL chips show current filters | Illegal enum values ignored; illegal date ignored; clear filters returns `/tasks` |
| `/calendar` | `date`, `range` | Selects a local date and controls today/week/all calendar scope; links to Tasks via helpers | `添加任务后显示日历`, `今天暂无截止`, `暂无近期截止` | Illegal date falls back to today; illegal/missing range falls back to `week` |
| `/stats` | `range` | Uses analytics and ECharts for today/week/all statistics; chart clicks link to Tasks | `暂无统计`, `暂无趋势`, `暂无状态`, `暂无优先级`, `暂无标签`, `暂无风险` | Illegal/missing range falls back to `week` |
| `/dashboard` | `range` | Controls Dashboard V2 overview, metrics, charts, focus/deadline/risk rail, and Stats detail links | Dashboard V2 empty and sync states; account/range distinction remains visible | Illegal/missing range falls back to `today` |

## Code Index

Protocol constants and href helpers:

- `src/lib/constants/query-params.ts`
  - `TASK_QUERY_KEYS`
  - `TASK_DUE_FILTERS`
  - `TASK_RISK_FILTERS`
  - `STATS_QUERY_KEYS`
  - `CALENDAR_QUERY_KEYS`
  - `DASHBOARD_RANGE_VALUES`
  - `buildTasksHref`
  - `buildStatsHref`
  - `buildCalendarHref`

Date and range logic:

- `src/features/tasks/utils/task-date-filters.ts`
- `src/features/tasks/utils/task-date-filters.test.ts`

Consumers and entry points:

- `src/components/task/task-list-client.tsx`
- `src/components/calendar/calendar-client.tsx`
- `src/components/dashboard/dashboard-client.tsx`
- `src/components/dashboard/v2`
- `src/components/stats/stats-client.tsx`

Visual QA context:

- `docs/ui-qa-dashboard-stats.md`

## Manual Regression Checklist

### Tasks

- `/tasks`
- `/tasks?date=2026-07-09`
- `/tasks?date=2026-07-09&range=week`
- `/tasks?range=today`
- `/tasks?range=week`
- `/tasks?range=all`
- `/tasks?priority=high&date=2026-07-09`
- `/tasks?status=done&date=2026-07-09&range=week`
- `/tasks?date=invalid`
- `/tasks?range=invalid`

Expected checks:

- Active chips match the URL.
- Illegal params do not crash.
- `date` / `range` suppresses `due` when both are present.
- Clearing filters returns to `/tasks`.

### Calendar

- `/calendar`
- `/calendar?date=2026-07-09`
- `/calendar?date=2026-07-09&range=week`
- `/calendar?range=today`
- `/calendar?range=all`
- `/calendar?date=invalid&range=invalid`

Expected checks:

- Selected date and active range are visible.
- Invalid date falls back to today.
- Invalid range falls back to week.
- Calendar links produce the expected Tasks URLs.

### Stats

- `/stats`
- `/stats?range=today`
- `/stats?range=week`
- `/stats?range=all`
- `/stats?range=invalid`

Expected checks:

- Range tab matches the URL or safe fallback.
- Charts and empty states update with range.
- Chart click-through hrefs target `/tasks` with the correct filter.

### Dashboard

- `/dashboard`
- `/dashboard?range=today`
- `/dashboard?range=week`
- `/dashboard?range=all`
- `/dashboard?range=invalid`

Expected checks:

- Range tab matches the URL or safe fallback.
- Hero, metric cards, charts, focus rail, deadlines, and risk data update with range.
- Trend detail link targets `/stats?range=<currentRange>`.
- Distribution chart links target `/tasks` filters.

## Future Playwright E2E Suggestions

Do not implement these until the project is ready to maintain E2E and browser baselines.

Recommended coverage:

- Click a Calendar day -> Tasks opens -> date chip appears -> list is filtered correctly.
- Click Calendar week task entry -> Tasks opens -> week chip appears -> list is filtered correctly.
- Click Calendar range all entry -> Tasks opens -> `全部日期` chip appears -> only tasks with valid `dueDate` are shown.
- Click Dashboard high priority -> Tasks opens -> high priority chip appears.
- Click Dashboard overdue/risk -> Tasks opens -> overdue/risk chip appears.
- Click Dashboard trend detail -> Stats opens with the same range.
- Click Stats status chart -> Tasks opens with matching status chip.
- Click Stats priority chart -> Tasks opens with matching priority chip.
- Click Stats tag chart -> Tasks opens with matching tag chip.
- Invalid `date` / `range` URLs do not crash.
- Clear filters returns to `/tasks`.
- Mobile widths have no unexpected horizontal overflow for Dashboard, Tasks, Calendar, Stats, and Settings.

## Step 12 Exit Criteria

- URL protocol is documented for Dashboard, Calendar, Stats, and Tasks.
- `query`, `tag`, `status`, `priority`, `sort`, `due`, `risk`, `date`, and `range` semantics are fixed.
- Current code locations are indexed.
- Manual regression URLs are listed.
- Future Playwright E2E scope is clear, but no Playwright dependency is added in this step.
