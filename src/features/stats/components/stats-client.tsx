"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DataEmptyState } from "@/shared/components/common/data-empty-state";
import { PageToolbar } from "@/shared/components/layout/page-toolbar";

import { EChartsClient } from "@/shared/components/charts/echarts-client";
import {
  buildTaskPriorityOption,
  buildTaskStatusOption,
  buildTaskTagTopOption,
  buildTaskComparisonOption,
} from "@/shared/components/charts/task-chart-options";
import { buildDashboardStats } from "@/features/tasks/utils/task-analytics";
import type {
  DashboardAnalyticsRange,
  DashboardDistributionItem,
  DashboardStats,
  DashboardTrendPoint,
} from "@/features/tasks/utils/task-analytics";
import type { TaskPriority, TaskStatus } from "@/features/tasks/types/task.types";
import {
  buildTasksHref,
  DASHBOARD_RANGE_VALUES,
  STATS_QUERY_KEYS,
  type DashboardRangeValue,
} from "@/shared/lib/constants/query-params";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { buildStatsTrend, getStatsRangeStart } from "@/features/stats/stats-trend";
import { useTaskStore } from "@/features/tasks/store/task-store";

type StatsClientProps = {
  initialRange: DashboardRangeValue;
};

const rangeOptions: Array<{ value: DashboardRangeValue; label: string }> = [
  { value: DASHBOARD_RANGE_VALUES.today, label: "今天" },
  { value: DASHBOARD_RANGE_VALUES.week, label: "本周" },
  { value: DASHBOARD_RANGE_VALUES.all, label: "全部" },
];

export function StatsClient({ initialRange }: StatsClientProps) {
  const { user, isConfigured, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tasks = useTaskStore((state) => state.tasks);
  const isLoading = useTaskStore((state) => state.isLoading);
  const taskError = useTaskStore((state) => state.error);
  const lastLoadedUserId = useTaskStore((state) => state.lastLoadedUserId);
  const syncTasks = useTaskStore((state) => state.syncTasks);
  const range = parseStatsRange(searchParams.get(STATS_QUERY_KEYS.range) ?? initialRange);

  useEffect(() => {
    if (isConfigured && !isLoading && !taskError && user?.id && lastLoadedUserId !== user.id) {
      void syncTasks(user.id);
    }
  }, [isConfigured, isLoading, taskError, lastLoadedUserId, syncTasks, user?.id]);

  const isSyncing = isAuthLoading || isLoading || Boolean(isConfigured && user && lastLoadedUserId !== user.id);
  const { stats, trend } = useMemo(() => {
    const now = new Date();
    return {
      stats: buildDashboardStats(tasks, { range, referenceDate: getStatsRangeStart(range, now), trendDays: 0 }),
      trend: buildStatsTrend(tasks, range, now),
    };
  }, [range, tasks]);
  const rangeLabel = rangeOptions.find((item) => item.value === range)?.label ?? "本周";

  const handleRangeChange = (nextRange: DashboardRangeValue) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(STATS_QUERY_KEYS.range, nextRange);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  let emptyState = null;
  if (taskError) {
    emptyState = (
      <DataEmptyState
        title="统计暂时无法加载"
        description={taskError}
        action={
          <button type="button" disabled={isLoading} onClick={() => void syncTasks(user?.id)}>
            重新加载
          </button>
        }
      />
    );
  } else if (isSyncing) {
    emptyState = <DataEmptyState title="正在加载统计" description="正在汇总当前工作区的任务数据。" />;
  } else if (!tasks.length) {
    emptyState = (
      <DataEmptyState
        title="还没有可统计的任务"
        description="创建任务后，可以在这里查看趋势和分布。"
        action={<Link href="/tasks">去任务页</Link>}
      />
    );
  } else if (!stats.totalCount) {
    emptyState = (
      <DataEmptyState
        title={`${rangeLabel}暂无任务`}
        description="这个时间范围内没有创建、更新、完成或到期的任务。"
        action={
          range !== "all" ? (
            <button type="button" onClick={() => handleRangeChange("all")}>
              查看全部
            </button>
          ) : undefined
        }
      />
    );
  }

  return (
    <section className="stats-shell">
      <StatsToolbar range={range} onRangeChange={handleRangeChange} />
      {emptyState ?? (
        <>
          <StatsOverview stats={stats} />
          <StatsTrendSection points={trend.points} intervalLabel={trend.intervalLabel} rangeLabel={rangeLabel} />
          <div className="stats-distribution-grid">
            <StatsStatusSection items={stats.statusDistribution} />
            <StatsPrioritySection items={stats.priorityDistribution} />
            <StatsTagSection items={stats.tagTop} />
          </div>
          {stats.overdueRisk.some((row) => row.count > 0) ? <StatsRiskSection rows={stats.overdueRisk} /> : null}
        </>
      )}
    </section>
  );
}

function StatsRangeTabs({
  range,
  onRangeChange,
}: {
  range: DashboardRangeValue;
  onRangeChange: (range: DashboardRangeValue) => void;
}) {
  return (
    <div className="stats-range-tabs" role="group" aria-label="统计范围">
      {rangeOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          className={range === option.value ? "stats-range-tabs__button is-active" : "stats-range-tabs__button"}
          aria-pressed={range === option.value}
          onClick={() => onRangeChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function StatsToolbar({
  range,
  onRangeChange,
}: {
  range: DashboardRangeValue;
  onRangeChange: (range: DashboardRangeValue) => void;
}) {
  return (
    <PageToolbar
      accessibleTitle="统计"
      className="stats-toolbar"
      context={
        <strong className="stats-toolbar__title" aria-hidden="true">
          统计
        </strong>
      }
      controls={<StatsRangeTabs range={range} onRangeChange={onRangeChange} />}
    />
  );
}

function StatsOverview({
  stats,
}: {
  stats: Pick<DashboardStats, "completedCount" | "totalCount" | "completionRate" | "overdueCount">;
}) {
  return (
    <section className="stats-overview card-surface" aria-label="关键指标">
      <dl>
        <div>
          <dt>已完成</dt>
          <dd>
            {stats.completedCount}
            <small> / {stats.totalCount} 项</small>
          </dd>
        </div>
        <div>
          <dt>完成率</dt>
          <dd>{stats.completionRate}%</dd>
        </div>
        <div className={stats.overdueCount > 0 ? "is-attention" : undefined}>
          <dt>逾期任务</dt>
          <dd>{stats.overdueCount}</dd>
        </div>
      </dl>
    </section>
  );
}

function StatsTrendSection({
  points,
  intervalLabel,
  rangeLabel,
}: {
  points: DashboardTrendPoint[];
  intervalLabel: string;
  rangeLabel: string;
}) {
  const total = points.reduce(
    (sum, point) => ({
      created: sum.created + point.created,
      completed: sum.completed + point.completed,
    }),
    { created: 0, completed: 0 },
  );

  return (
    <section className="stats-panel stats-panel--trend card-surface" aria-labelledby="stats-trend-heading">
      <div className="stats-panel__head">
        <h2 id="stats-trend-heading">新增与完成趋势</h2>
        <span>
          {rangeLabel} · {intervalLabel}
        </span>
      </div>
      {points.length ? (
        <EChartsClient
          className="stats-echart stats-echart--large"
          ariaLabel={`统计趋势图，${rangeLabel}新增 ${total.created} 项，完成 ${total.completed} 项`}
          option={buildTaskComparisonOption(points)}
        />
      ) : (
        <DataEmptyState
          variant="panel"
          title="暂无新增或完成记录"
          description="所选范围内有任务，但没有可绘制的新增或完成记录。"
        />
      )}
    </section>
  );
}

function StatsStatusSection({ items }: { items: Array<DashboardDistributionItem<TaskStatus>> }) {
  return (
    <section className="stats-panel card-surface">
      <div className="stats-panel__head">
        <h2>状态分布</h2>
      </div>
      <EChartsClient
        className="stats-echart stats-echart--status"
        ariaLabel="状态分布图"
        option={buildTaskStatusOption(items)}
        getClickHref={(params) => {
          const item = findDistributionItemByChartName(items, params);
          return item ? buildTasksHref({ status: item.value }) : undefined;
        }}
      />
      <ul className="stats-status-legend" aria-label="各状态任务数">
        {items.map((item) => (
          <li key={item.value}>
            <Link href={buildTasksHref({ status: item.value })}>
              <span className="stats-status-legend__dot" style={{ background: item.color }} aria-hidden="true" />
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatsPrioritySection({ items }: { items: Array<DashboardDistributionItem<TaskPriority>> }) {
  return (
    <section className="stats-panel card-surface">
      <div className="stats-panel__head">
        <h2>优先级分布</h2>
      </div>
      <EChartsClient
        className="stats-echart"
        ariaLabel={`优先级分布图，${items.map((item) => `${item.label} ${item.count} 项`).join("，")}`}
        option={buildTaskPriorityOption(items)}
        getClickHref={(params) => {
          const item = findDistributionItemByChartName(items, params);
          return item ? buildTasksHref({ priority: item.value }) : undefined;
        }}
      />
    </section>
  );
}

function StatsTagSection({ items }: { items: DashboardStats["tagTop"] }) {
  return (
    <section className="stats-panel card-surface">
      <div className="stats-panel__head">
        <h2>标签 Top 5</h2>
      </div>
      {items.length ? (
        <EChartsClient
          className="stats-echart"
          ariaLabel={`标签 Top 5 图，${items.map((item) => `${item.tag} ${item.count} 项`).join("，")}`}
          option={buildTaskTagTopOption(items)}
          getClickHref={(params) => {
            const tag = getChartParamName(params);
            return tag ? buildTasksHref({ tag }) : undefined;
          }}
        />
      ) : (
        <DataEmptyState variant="panel" title="暂无标签数据" description="为任务添加标签后显示排行。" />
      )}
    </section>
  );
}

function StatsRiskSection({ rows }: { rows: DashboardStats["overdueRisk"] }) {
  return (
    <section className="stats-panel card-surface" aria-labelledby="stats-risk-heading">
      <div className="stats-panel__head">
        <h2 id="stats-risk-heading">风险诊断</h2>
        <span>按截止日期与优先级评估</span>
      </div>
      <ul className="stats-risk-list">
        {rows.map((row) => (
          <li key={row.level}>
            <Link href={buildTasksHref({ risk: row.level })}>
              <span className="stats-risk-list__label">
                <strong>{row.label}</strong>
                <small>{row.helper}</small>
              </span>
              <b>{row.count}</b>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function parseStatsRange(value: string | null | undefined): DashboardAnalyticsRange {
  if (value === DASHBOARD_RANGE_VALUES.today || value === DASHBOARD_RANGE_VALUES.all) {
    return value;
  }

  return DASHBOARD_RANGE_VALUES.week;
}

function findDistributionItemByChartName<TValue extends string>(
  items: Array<DashboardDistributionItem<TValue>>,
  params: unknown,
) {
  const name = getChartParamName(params);
  return items.find((item) => item.label === name || item.label.replace("优先级", "") === name);
}

function getChartParamName(params: unknown) {
  if (!params || typeof params !== "object" || !("name" in params)) {
    return "";
  }

  const name = (params as { name?: unknown }).name;

  return typeof name === "string" ? name : "";
}
