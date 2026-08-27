import Link from "next/link";

import { EChartsClient } from "@/shared/components/charts/echarts-client";
import { DataEmptyState } from "@/shared/components/common/data-empty-state";
import { buildTaskTrendOption } from "@/shared/components/charts/task-chart-options";
import type {
  DashboardAnalyticsRange,
  DashboardStats,
  DashboardTrendPoint,
} from "@/features/tasks/utils/task-analytics";
import { buildStatsHref, buildTasksHref } from "@/shared/lib/constants/query-params";

type DashboardTrendPanelProps = {
  stats: DashboardStats;
  trend: DashboardTrendPoint[];
  range: DashboardAnalyticsRange;
  rangeLabel: string;
  isEmpty?: boolean;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  hasPreviousData?: boolean;
};

export function DashboardTrendPanel({
  stats,
  trend,
  range,
  rangeLabel,
  isEmpty = false,
  isLoading = false,
  error = null,
  onRetry,
  hasPreviousData = false,
}: DashboardTrendPanelProps) {
  if (range === "today") {
    return (
      <TodayPacePanel
        stats={stats}
        isEmpty={isEmpty}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        hasPreviousData={hasPreviousData}
      />
    );
  }

  const hasTrendData = !isEmpty && trend.some((point) => point.completed > 0 || point.created > 0);
  const dataPointCount = trend.filter((point) => point.completed > 0 || point.created > 0).length;
  const option = buildTaskTrendOption(trend, { sparse: dataPointCount <= 1 });

  return (
    <section className="dashboard-v2-panel dashboard-v2-trend">
      <div className="dashboard-v2-panel__head">
        <h2>{getTrendTitle(range)}</h2>
        <Link href={buildStatsHref({ range })}>{rangeLabel}详情</Link>
      </div>
      {hasTrendData ? (
        <EChartsClient
          className="dashboard-v2-echart dashboard-v2-echart--trend"
          ariaLabel="任务完成趋势图"
          option={option}
        />
      ) : (
        <DataEmptyState variant="panel" title="暂无趋势" description={rangeLabel + "完成或新增任务后显示趋势。"} />
      )}
    </section>
  );
}

function TodayPacePanel({
  stats,
  isEmpty,
  isLoading,
  error,
  onRetry,
  hasPreviousData,
}: {
  stats: DashboardStats;
  isEmpty: boolean;
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  hasPreviousData: boolean;
}) {
  const pace = stats.todayPace;
  const hasAction =
    pace.completedCount > 0 || pace.inProgressCount > 0 || pace.dueTodayCount > 0 || pace.overdueCount > 0;
  const status =
    pace.overdueCount > 0
      ? `优先处理 ${pace.overdueCount} 项逾期任务`
      : pace.inProgressCount > 0
        ? `继续推进 ${pace.inProgressCount} 项进行中任务`
        : pace.dueTodayCount > 0
          ? `今天有 ${pace.dueTodayCount} 项任务截止`
          : pace.completedCount > 0
            ? "今天的任务正在稳步完成"
            : "从优先处理列表中选择一项开始";
  const primarySignal =
    pace.overdueCount > 0
      ? { label: "已逾期", value: pace.overdueCount, tone: "risk" as const, href: buildTasksHref({ due: "overdue" }) }
      : pace.inProgressCount > 0
        ? {
            label: "进行中",
            value: pace.inProgressCount,
            tone: "progress" as const,
            href: buildTasksHref({ status: "in_progress" }),
          }
        : pace.dueTodayCount > 0
          ? {
              label: "今天截止",
              value: pace.dueTodayCount,
              tone: "due" as const,
              href: buildTasksHref({ due: "today" }),
            }
          : {
              label: "今日完成",
              value: pace.completedCount,
              tone: "done" as const,
              href: buildTasksHref({ status: "done" }),
            };

  return (
    <section className="dashboard-v2-panel dashboard-v2-today-pace">
      <div className="dashboard-v2-panel__head">
        <div>
          <h2>
            今日任务统计
            {isLoading && hasPreviousData ? <span className="dashboard-v2-today-pace__refreshing">刷新中</span> : null}
          </h2>
        </div>
        <Link href={buildStatsHref({ range: "today" })}>今日详情</Link>
      </div>
      {error ? (
        <div className="dashboard-v2-today-pace__state dashboard-v2-today-pace__state--error" role="alert">
          <strong>今日节奏加载失败</strong>
          <span>{error}</span>
          {onRetry ? (
            <button type="button" onClick={onRetry}>
              重新加载
            </button>
          ) : null}
        </div>
      ) : isLoading && !hasPreviousData ? (
        <div
          className="dashboard-v2-today-pace__state dashboard-v2-today-pace__state--loading"
          aria-label="正在加载今日任务节奏"
          aria-busy="true"
        >
          <span className="dashboard-v2-today-pace__skeleton dashboard-v2-today-pace__skeleton--summary" />
          <div className="dashboard-v2-today-pace__skeleton-grid">
            {Array.from({ length: 4 }, (_, index) => (
              <span
                className="dashboard-v2-today-pace__skeleton dashboard-v2-today-pace__skeleton--signal"
                key={index}
              />
            ))}
          </div>
        </div>
      ) : isEmpty ? (
        <div className="dashboard-v2-today-pace__state dashboard-v2-today-pace__state--empty">
          <strong>今天暂无任务</strong>
          <span>创建或安排一条任务后，这里会显示今天的完成、推进和截止情况。</span>
        </div>
      ) : (
        <div className="dashboard-v2-today-pace__body">
          <div className={hasAction ? "dashboard-v2-today-pace__summary" : "dashboard-v2-today-pace__summary is-empty"}>
            <strong>{status}</strong>
            <dl className="dashboard-v2-today-pace__primary-list" aria-label="今日主任务指标">
              <PrimarySignal {...primarySignal} />
            </dl>
            <Link className="dashboard-v2-today-pace__primary-action" href={primarySignal.href}>
              查看{primarySignal.label}任务 <span aria-hidden="true">→</span>
            </Link>
          </div>
          <dl className="dashboard-v2-today-pace__signals" aria-label="今日任务信号">
            {[
              {
                label: "今日完成",
                value: pace.completedCount,
                tone: "done" as const,
                href: buildTasksHref({ status: "done" }),
                key: "done",
              },
              {
                label: "进行中",
                value: pace.inProgressCount,
                tone: "progress" as const,
                href: buildTasksHref({ status: "in_progress" }),
                key: "progress",
              },
              {
                label: "今天截止",
                value: pace.dueTodayCount,
                tone: pace.dueTodayCount > 0 ? ("due" as const) : ("neutral" as const),
                href: buildTasksHref({ due: "today" }),
                key: "due",
              },
              {
                label: "已逾期",
                value: pace.overdueCount,
                tone: pace.overdueCount > 0 ? ("risk" as const) : ("neutral" as const),
                href: buildTasksHref({ due: "overdue" }),
                key: "risk",
              },
            ]
              .filter((signal) => signal.key !== primarySignal.tone)
              .map((signal) => (
                <Signal {...signal} key={signal.key} />
              ))}
          </dl>
        </div>
      )}
    </section>
  );
}

function PrimarySignal({
  label,
  value,
  tone,
  href,
}: {
  label: string;
  value: number;
  tone: "done" | "due" | "progress" | "risk";
  href: string;
}) {
  return (
    <div className={"dashboard-v2-today-pace__primary dashboard-v2-today-pace__primary--" + tone}>
      <dt>{label}</dt>
      <dd>
        <Link href={href}>{value}</Link>
      </dd>
    </div>
  );
}

function Signal({
  label,
  value,
  tone,
  href,
}: {
  label: string;
  value: number;
  tone: "done" | "progress" | "due" | "risk" | "neutral";
  href: string;
}) {
  return (
    <div className={"dashboard-v2-today-pace__signal dashboard-v2-today-pace__signal--" + tone}>
      <dt>
        <Link href={href}>{label}</Link>
      </dt>
      <dd>
        <Link href={href}>{value}</Link>
      </dd>
    </div>
  );
}

function getTrendTitle(range: DashboardAnalyticsRange) {
  return range === "week" ? "本周完成趋势" : "完成趋势";
}
