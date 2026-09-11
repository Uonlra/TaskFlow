"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DataEmptyState } from "@/shared/components/common/data-empty-state";
import { PageToolbar } from "@/shared/components/layout/page-toolbar";
import { PageToolbarTemporalContext } from "@/shared/components/layout/page-toolbar-context";

import { EChartsClient } from "@/shared/components/charts/echarts-client";
import {
  buildTaskPriorityOption,
  buildTaskStatusOption,
  buildTaskTagTopOption,
  buildTaskTrendOption,
} from "@/shared/components/charts/task-chart-options";
import { buildDashboardStats } from "@/features/tasks/utils/task-analytics";
import type {
  DashboardAnalyticsRange,
  DashboardDistributionItem,
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
        <StatsToolbar
          range={range}
          onRangeChange={handleRangeChange}
          isSyncing={isSyncing}
          totalCount={stats.totalCount}
          completionRate={stats.completionRate}
          overdueCount={stats.overdueCount}
          trend={stats.trend}
        />
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
        <StatsToolbar
          range={range}
          onRangeChange={handleRangeChange}
          isSyncing={isSyncing}
          totalCount={stats.totalCount}
          completionRate={stats.completionRate}
          overdueCount={stats.overdueCount}
          trend={stats.trend}
        />
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
      <StatsToolbar
        range={range}
        onRangeChange={handleRangeChange}
        isSyncing={isSyncing}
        totalCount={stats.totalCount}
        completionRate={stats.completionRate}
        overdueCount={stats.overdueCount}
        trend={stats.trend}
      />
      <StatsOverview
        completionRate={stats.completionRate}
        completedCount={stats.completedCount}
        activeCount={stats.activeCount}
        totalCount={stats.totalCount}
        overdueCount={stats.overdueCount}
        isLoading={isSyncing}
      />
      <div className="stats-primary-grid">
        <StatsTrendSection
          hasData={hasTrendData}
          isSyncing={isSyncing}
          insight={buildStatsInsight({
            range,
            totalCount: stats.totalCount,
            completedCount: stats.completedCount,
            activeCount: stats.activeCount,
            completionRate: stats.completionRate,
            overdueCount: stats.overdueCount,
          })}
          option={buildTaskTrendOption(stats.trend)}
        />
        <StatsRiskSection hasData={hasRiskData} isSyncing={isSyncing} rows={stats.overdueRisk} />
      </div>
      <div className="stats-distribution-grid">
        <StatsStatusSection hasData={hasStatusData} isSyncing={isSyncing} items={stats.statusDistribution} />
        <StatsPrioritySection hasData={hasPriorityData} isSyncing={isSyncing} items={stats.priorityDistribution} />
        <StatsTagSection hasData={hasTagData} isSyncing={isSyncing} items={stats.tagTop} />
      </div>
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
    <div className="stats-range-tabs date-switcher" role="group" aria-label="统计范围">
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
  );
}

export function StatsToolbar({
  range,
  isSyncing,
  onRangeChange,
  totalCount = 0,
  completionRate = 0,
  overdueCount = 0,
  trend = [],
}: {
  range: DashboardRangeValue;
  isSyncing: boolean;
  onRangeChange: (range: DashboardRangeValue) => void;
  totalCount?: number;
  completionRate?: number;
  overdueCount?: number;
  trend?: DashboardTrendPoint[];
}) {
  const rangeLabel = rangeOptions.find((item) => item.value === range)?.label ?? "本周";
  const summary = buildStatsToolbarSummary({ totalCount, completionRate, overdueCount, isSyncing });
  const progressValue = isSyncing ? 0 : Math.max(0, Math.min(100, completionRate));
  const animatedProgressValue = useAnimatedNumber(progressValue);
  const hasRisk = !isSyncing && overdueCount > 0;

  return (
    <>
      <PageToolbar
        accessibleTitle="统计"
        className={hasRisk ? "stats-toolbar is-risk" : "stats-toolbar"}
        context={
          <div className="stats-toolbar__context">
            <div className="stats-toolbar__identity">
              <span className="stats-toolbar__eyebrow">WORKSPACE PULSE</span>
              <strong>统计概览</strong>
            </div>
            <PageToolbarTemporalContext rangeLabel={rangeLabel} statusLabel={isSyncing ? "同步中" : undefined} />
          </div>
        }
        controls={
          <div className="stats-toolbar__controls">
            <StatsToolbarVisuals completionRate={animatedProgressValue} trend={trend} isRisk={hasRisk} />
            <div className="stats-toolbar__signal" aria-live="polite">
              <span
                className={
                  isSyncing
                    ? "stats-toolbar__signal-dot is-pulsing"
                    : hasRisk
                      ? "stats-toolbar__signal-dot is-risk"
                      : "stats-toolbar__signal-dot"
                }
              />
              <span key={`${range}-${summary}`} className="stats-toolbar__summary-text">
                {summary}
              </span>
            </div>
            <StatsRangeTabs range={range} onRangeChange={onRangeChange} />
          </div>
        }
      />
      <div
        className="stats-toolbar__progress"
        role="progressbar"
        aria-label="当前范围完成率"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressValue}
      >
        <span style={{ width: `${animatedProgressValue}%` }} />
      </div>
    </>
  );
}

function useAnimatedNumber(target: number, duration = 520) {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);

  useEffect(() => {
    const from = valueRef.current;

    if (from === target) {
      return;
    }

    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      const nextValue = Math.round(from + (target - from) * eased);

      valueRef.current = nextValue;
      setValue(nextValue);

      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    frame = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frame);
  }, [duration, target]);

  return value;
}

function StatsToolbarVisuals({
  completionRate,
  trend,
  isRisk,
}: {
  completionRate: number;
  trend: DashboardTrendPoint[];
  isRisk: boolean;
}) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - completionRate / 100);
  const sparkline = buildSparklineData(trend);

  return (
    <div className={isRisk ? "stats-toolbar__visuals is-risk" : "stats-toolbar__visuals"}>
      <span className="stats-toolbar__ring" aria-hidden="true">
        <svg viewBox="0 0 40 40" focusable="false">
          <circle className="stats-toolbar__ring-track" cx="20" cy="20" r={radius} />
          <circle
            className="stats-toolbar__ring-value"
            cx="20"
            cy="20"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <b>{completionRate}</b>
      </span>
      <span className="stats-toolbar__sparkline" role="img" aria-label="近期任务趋势，悬停数据点查看详情">
        <svg viewBox="0 0 96 28" preserveAspectRatio="none" focusable="false">
          <polyline points={sparkline.polyline} />
          {sparkline.points.map((point) => (
            <circle
              key={`${point.x}-${point.label}`}
              cx={point.x}
              cy={point.y}
              r="2.25"
              tabIndex={0}
              aria-label={`${point.label}：完成 ${point.completed}，新增 ${point.created}`}
            >
              <title>
                {point.label}：完成 {point.completed} · 新增 {point.created}
              </title>
            </circle>
          ))}
        </svg>
      </span>
    </div>
  );
}

function buildSparklineData(trend: DashboardTrendPoint[]) {
  const values = trend.flatMap((point) => [point.completed, point.created]);

  if (values.length === 0 || values.every((value) => value === 0)) {
    return { polyline: "0,24 16,24 32,24 48,24 64,24 80,24 96,24", points: [] };
  }

  const max = Math.max(1, ...values);
  const points = trend.map((point, index) => {
    const x = trend.length === 1 ? 48 : (index / (trend.length - 1)) * 96;
    const value = point.completed + point.created;
    const y = 24 - (value / (max * 2)) * 18;
    return {
      x: Number(x.toFixed(1)),
      y: Number(Math.max(4, y).toFixed(1)),
      label: point.label,
      completed: point.completed,
      created: point.created,
    };
  });

  return {
    polyline: points.map((point) => `${point.x},${point.y}`).join(" "),
    points,
  };
}

function buildStatsToolbarSummary({
  totalCount,
  completionRate,
  overdueCount,
  isSyncing,
}: {
  totalCount: number;
  completionRate: number;
  overdueCount: number;
  isSyncing: boolean;
}) {
  if (isSyncing) {
    return "正在同步最新数据";
  }

  if (totalCount === 0) {
    return "等待任务数据";
  }

  if (overdueCount > 0) {
    return `${overdueCount} 项逾期需关注`;
  }

  return `完成率 ${completionRate}% · ${totalCount} 项任务`;
}

function StatsOverview({
  completionRate,
  completedCount,
  activeCount,
  totalCount,
  overdueCount,
  isLoading,
}: {
  completionRate: number;
  completedCount: number;
  activeCount: number;
  totalCount: number;
  overdueCount: number;
  isLoading: boolean;
}) {
  const riskHelper = isLoading ? "正在同步" : overdueCount > 0 ? "需要关注" : "暂无逾期";

  return (
    <section className="stats-overview card-surface">
      <article className="stats-overview__item stats-overview__item--completion">
        <span>完成率</span>
        <strong>{isLoading ? "--" : `${completionRate}%`}</strong>
        <small>所选范围内</small>
        <progress aria-label="任务完成率" max={100} value={isLoading ? 0 : completionRate} />
      </article>
      <article className="stats-overview__item">
        <span>已完成</span>
        <strong>{isLoading ? "--" : `${completedCount}/${totalCount}`}</strong>
        <small>完成 / 总数</small>
      </article>
      <article className="stats-overview__item">
        <span>待处理</span>
        <strong>{isLoading ? "--" : activeCount}</strong>
        <small>未完成任务</small>
      </article>
      <article
        className={
          !isLoading && overdueCount > 0
            ? "stats-overview__item stats-overview__item--risk is-attention"
            : "stats-overview__item stats-overview__item--risk"
        }
      >
        <span>逾期风险</span>
        <strong>{isLoading ? "--" : overdueCount}</strong>
        <small>{riskHelper}</small>
      </article>
    </section>
  );
}

export function buildStatsInsight({
  range,
  totalCount,
  completedCount,
  activeCount,
  completionRate,
  overdueCount,
}: {
  range: DashboardRangeValue;
  totalCount: number;
  completedCount: number;
  activeCount: number;
  completionRate: number;
  overdueCount: number;
}) {
  const rangeLabel = range === "today" ? "今天" : range === "week" ? "本周" : "全部任务";

  if (totalCount === 0) {
    return `${rangeLabel}暂无任务数据。`;
  }

  if (overdueCount > 0) {
    return `${rangeLabel}有 ${overdueCount} 项逾期，完成率 ${completionRate}%，建议优先处理风险任务。`;
  }

  if (completedCount === totalCount) {
    return `${rangeLabel}的 ${totalCount} 项均已完成。`;
  }

  if (completionRate >= 75) {
    return `${rangeLabel}已完成 ${completedCount}/${totalCount} 项，整体节奏稳定。`;
  }

  return `${rangeLabel}仍有 ${activeCount} 项待处理，当前完成率 ${completionRate}%。`;
}

function StatsTrendSection({
  hasData,
  isSyncing,
  insight,
  option,
}: {
  hasData: boolean;
  isSyncing: boolean;
  insight: string;
  option: ReturnType<typeof buildTaskTrendOption>;
}) {
  return (
    <section className="stats-panel stats-panel--trend card-surface">
      <div className="stats-panel__head">
        <div>
          <h2>任务完成趋势</h2>
          <p className="stats-panel__insight">{insight}</p>
        </div>
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
  const riskCount = rows.reduce((total, row) => total + row.count, 0);

  return (
    <section className="stats-panel stats-panel--risk card-surface">
      <div className="stats-panel__head">
        <div>
          <h2>风险诊断</h2>
          <p className="stats-panel__insight">按截止日期与优先级评估</p>
        </div>
        <span>点击查看</span>
      </div>
      {hasData ? (
        <div className="stats-risk-body">
          <div className="stats-risk-summary">
            <strong>{riskCount}</strong>
            <span>项任务处于风险窗口</span>
          </div>
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
