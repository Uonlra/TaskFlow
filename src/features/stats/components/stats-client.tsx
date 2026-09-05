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
  buildTaskTrendOption,
} from "@/shared/components/charts/task-chart-options";
import { buildDashboardStats } from "@/features/tasks/utils/task-analytics";
import type { DashboardAnalyticsRange, DashboardDistributionItem } from "@/features/tasks/utils/task-analytics";
import type { TaskPriority, TaskStatus } from "@/features/tasks/types/task.types";
import {
  buildTasksHref,
  DASHBOARD_RANGE_VALUES,
  STATS_QUERY_KEYS,
  type DashboardRangeValue,
} from "@/shared/lib/constants/query-params";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { getWorkspaceState } from "@/features/auth/utils/workspace-state";
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
  const lastLoadedUserId = useTaskStore((state) => state.lastLoadedUserId);
  const syncTasks = useTaskStore((state) => state.syncTasks);
  const range = parseStatsRange(searchParams.get(STATS_QUERY_KEYS.range) ?? initialRange);

  useEffect(() => {
    if (isConfigured && !isLoading && user?.id && lastLoadedUserId !== user.id) {
      void syncTasks(user.id);
    }
  }, [isConfigured, isLoading, lastLoadedUserId, syncTasks, user?.id]);

  const stats = useMemo(() => buildDashboardStats(tasks, { range }), [range, tasks]);
  const workspaceState = getWorkspaceState({
    isAuthLoading,
    isTaskLoading: isLoading,
    taskCount: tasks.length,
    userId: user?.id,
  });
  const isSyncing = Boolean(user && workspaceState === "syncing");
  const isAccountEmpty = !isAuthLoading && tasks.length === 0;
  const isRangeEmpty = isAccountEmpty || stats.totalCount === 0;
  const hasTrendData = !isRangeEmpty && stats.trend.some((point) => point.completed > 0 || point.created > 0);
  const hasStatusData = !isRangeEmpty && stats.statusDistribution.some((item) => item.count > 0);
  const hasPriorityData = !isRangeEmpty && stats.priorityDistribution.some((item) => item.count > 0);
  const hasTagData = !isRangeEmpty && stats.tagTop.length > 0;
  const hasRiskData = !isRangeEmpty && stats.overdueRisk.some((item) => item.count > 0);

  const handleRangeChange = (nextRange: DashboardRangeValue) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(STATS_QUERY_KEYS.range, nextRange);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (isAccountEmpty) {
    return (
      <section className="stats-shell stats-shell--empty">
        <StatsToolbar range={range} onRangeChange={handleRangeChange} isSyncing={isSyncing} />
        <DataEmptyState
          title="还没有可统计的数据"
          description="创建任务并更新状态后，这里会生成趋势和分布。"
          action={<Link href="/tasks">创建任务</Link>}
        />
      </section>
    );
  }

  if (isRangeEmpty) {
    return (
      <section className="stats-shell stats-shell--empty">
        <StatsToolbar range={range} onRangeChange={handleRangeChange} isSyncing={isSyncing} />
        <DataEmptyState
          variant="table"
          title={`${rangeOptions.find((item) => item.value === range)?.label ?? "当前范围"}暂无统计数据`}
          description="切换统计范围，查看其他时间段的任务数据。"
        />
      </section>
    );
  }
  return (
    <section className="stats-shell">
      <StatsToolbar range={range} onRangeChange={handleRangeChange} isSyncing={isSyncing} />
      <StatsOverview
        completionRate={stats.completionRate}
        completedCount={stats.completedCount}
        activeCount={stats.activeCount}
        totalCount={stats.totalCount}
        accountTotalCount={tasks.length}
        overdueCount={stats.overdueCount}
        isLoading={isSyncing}
        isRangeEmpty={isRangeEmpty}
      />
      <StatsInsightPanel
        range={range}
        isAccountEmpty={isAccountEmpty}
        isRangeEmpty={isRangeEmpty}
        totalTaskCount={tasks.length}
        completionRate={stats.completionRate}
        overdueCount={stats.overdueCount}
      />
      <div className="stats-layout-grid">
        <StatsTrendSection hasData={hasTrendData} isSyncing={isSyncing} option={buildTaskTrendOption(stats.trend)} />
        <StatsStatusSection hasData={hasStatusData} isSyncing={isSyncing} items={stats.statusDistribution} />
        <StatsPrioritySection hasData={hasPriorityData} isSyncing={isSyncing} items={stats.priorityDistribution} />
        <StatsTagSection hasData={hasTagData} isSyncing={isSyncing} items={stats.tagTop} />
        <StatsRiskSection hasData={hasRiskData} isSyncing={isSyncing} rows={stats.overdueRisk} />
      </div>
    </section>
  );
}

export function StatsToolbar({
  range,
  isSyncing,
  onRangeChange,
}: {
  range: DashboardRangeValue;
  isSyncing: boolean;
  onRangeChange: (range: DashboardRangeValue) => void;
}) {
  return (
    <PageToolbar
      accessibleTitle="统计"
      className="stats-toolbar"
      context={isSyncing ? <span className="page-toolbar__status">同步中</span> : undefined}
      controls={
        <div className="stats-range-tabs date-switcher" aria-label="统计范围">
          {rangeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={
                range === option.value
                  ? "stats-range-tabs__button date-switcher__button is-active"
                  : "stats-range-tabs__button date-switcher__button"
              }
              aria-pressed={range === option.value}
              onClick={() => onRangeChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      }
    />
  );
}

function StatsOverview({
  completionRate,
  completedCount,
  activeCount,
  totalCount,
  accountTotalCount,
  overdueCount,
  isLoading,
  isRangeEmpty,
}: {
  completionRate: number;
  completedCount: number;
  activeCount: number;
  totalCount: number;
  accountTotalCount: number;
  overdueCount: number;
  isLoading: boolean;
  isRangeEmpty: boolean;
}) {
  const riskHelper = isLoading ? "正在同步" : overdueCount > 0 ? "需要关注" : "暂无逾期";

  return (
    <section className="stats-overview card-surface">
      <article>
        <span>完成率</span>
        <strong>{isLoading ? "--" : `${completionRate}%`}</strong>
        <small>{isRangeEmpty ? "当前范围" : "所选范围内"}</small>
      </article>
      <article>
        <span>已完成</span>
        <strong>{isLoading ? "--" : `${completedCount}/${totalCount}`}</strong>
        <small>完成 / 总数</small>
      </article>
      <article>
        <span>待处理</span>
        <strong>{isLoading ? "--" : activeCount}</strong>
        <small>未完成任务</small>
      </article>
      <article>
        <span>全部任务</span>
        <strong>{isLoading ? "--" : accountTotalCount}</strong>
        <small>账号总量</small>
      </article>
      <article
        className={
          !isLoading && overdueCount > 0 ? "stats-overview__item--risk is-attention" : "stats-overview__item--risk"
        }
      >
        <span>逾期风险</span>
        <strong>{isLoading ? "--" : overdueCount}</strong>
        <small>{riskHelper}</small>
      </article>
    </section>
  );
}

function StatsInsightPanel({
  range,
  isAccountEmpty,
  isRangeEmpty,
  totalTaskCount,
  completionRate,
  overdueCount,
}: {
  range: DashboardRangeValue;
  isAccountEmpty: boolean;
  isRangeEmpty: boolean;
  totalTaskCount: number;
  completionRate: number;
  overdueCount: number;
}) {
  const rangeLabel = rangeOptions.find((item) => item.value === range)?.label ?? "本周";
  const insight = isAccountEmpty
    ? "暂无统计"
    : isRangeEmpty
      ? `${rangeLabel}暂无数据，全部任务 ${totalTaskCount} 项。`
      : overdueCount > 0
        ? `有 ${overdueCount} 项风险，先处理临近和高优先级任务。`
        : `完成率 ${completionRate}%，当前节奏稳定。`;

  return (
    <section className="stats-insight card-surface">
      <span className="stats-eyebrow">洞察</span>
      <p>{insight}</p>
    </section>
  );
}

function StatsTrendSection({
  hasData,
  isSyncing,
  option,
}: {
  hasData: boolean;
  isSyncing: boolean;
  option: ReturnType<typeof buildTaskTrendOption>;
}) {
  return (
    <section className="stats-panel stats-panel--wide card-surface">
      <div className="stats-panel__head">
        <h2>任务完成趋势</h2>
        <span>完成 / 新增</span>
      </div>
      {hasData ? (
        <EChartsClient className="stats-echart stats-echart--large" ariaLabel="统计趋势图" option={option} />
      ) : (
        <StatsEmptyState isSyncing={isSyncing} label="暂无趋势" description="完成或新增任务后显示趋势。" />
      )}
    </section>
  );
}

function StatsStatusSection({
  hasData,
  isSyncing,
  items,
}: {
  hasData: boolean;
  isSyncing: boolean;
  items: Array<DashboardDistributionItem<TaskStatus>>;
}) {
  return (
    <section className="stats-panel card-surface">
      <div className="stats-panel__head">
        <h2>状态分布</h2>
        <span>点击筛选</span>
      </div>
      {hasData ? (
        <EChartsClient
          className="stats-echart"
          ariaLabel="状态分布图"
          option={buildTaskStatusOption(items)}
          getClickHref={(params) => {
            const item = findDistributionItemByChartName(items, params);
            return item ? buildTasksHref({ status: item.value }) : undefined;
          }}
        />
      ) : (
        <StatsEmptyState isSyncing={isSyncing} label="暂无状态分布" description="更新任务状态后显示分布。" />
      )}
    </section>
  );
}

function StatsPrioritySection({
  hasData,
  isSyncing,
  items,
}: {
  hasData: boolean;
  isSyncing: boolean;
  items: Array<DashboardDistributionItem<TaskPriority>>;
}) {
  return (
    <section className="stats-panel card-surface">
      <div className="stats-panel__head">
        <h2>优先级分布</h2>
        <span>点击筛选</span>
      </div>
      {hasData ? (
        <EChartsClient
          className="stats-echart"
          ariaLabel="优先级分布图"
          option={buildTaskPriorityOption(items)}
          getClickHref={(params) => {
            const item = findDistributionItemByChartName(items, params);
            return item ? buildTasksHref({ priority: item.value }) : undefined;
          }}
        />
      ) : (
        <StatsEmptyState isSyncing={isSyncing} label="暂无优先级分布" description="设置任务优先级后显示分布。" />
      )}
    </section>
  );
}

function StatsTagSection({
  hasData,
  isSyncing,
  items,
}: {
  hasData: boolean;
  isSyncing: boolean;
  items: ReturnType<typeof buildDashboardStats>["tagTop"];
}) {
  return (
    <section className="stats-panel card-surface">
      <div className="stats-panel__head">
        <h2>标签 Top 5</h2>
        <span>点击筛选</span>
      </div>
      {hasData ? (
        <EChartsClient
          className="stats-echart"
          ariaLabel="标签 Top 5 图"
          option={buildTaskTagTopOption(items)}
          getClickHref={(params) => {
            const tag = getChartParamName(params);
            return tag ? buildTasksHref({ tag }) : undefined;
          }}
        />
      ) : (
        <StatsEmptyState isSyncing={isSyncing} label="暂无标签数据" description="为任务添加标签后显示排行。" />
      )}
    </section>
  );
}

function StatsRiskSection({
  hasData,
  isSyncing,
  rows,
}: {
  hasData: boolean;
  isSyncing: boolean;
  rows: ReturnType<typeof buildDashboardStats>["overdueRisk"];
}) {
  return (
    <section className="stats-panel card-surface">
      <div className="stats-panel__head">
        <h2>逾期风险</h2>
        <span>点击筛选</span>
      </div>
      {hasData ? (
        <div className="stats-risk-list">
          {rows.map((row) => (
            <a key={row.level} href={buildTasksHref({ risk: row.level })}>
              <span style={{ background: row.color }} />
              <strong>{row.label}</strong>
              <small>{row.helper}</small>
              <b>{row.count}</b>
            </a>
          ))}
        </div>
      ) : (
        <StatsEmptyState isSyncing={isSyncing} label="暂无逾期风险" description="当前范围没有逾期任务。" />
      )}
    </section>
  );
}

function StatsEmptyState({
  isSyncing,
  label,
  description,
}: {
  isSyncing: boolean;
  label: string;
  description: string;
}) {
  return (
    <DataEmptyState
      variant="panel"
      title={isSyncing ? "同步中" : label}
      description={isSyncing ? "数据准备完成后自动显示。" : description}
    />
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
