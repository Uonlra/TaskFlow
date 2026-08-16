import Link from "next/link";

import { EChartsClient } from "@/shared/components/charts/echarts-client";
import { DataEmptyState } from "@/shared/components/common/data-empty-state";
import { buildTaskTrendOption } from "@/shared/components/charts/task-chart-options";
import type {
  DashboardAnalyticsRange,
  DashboardStats,
  DashboardTrendPoint,
} from "@/features/tasks/utils/task-analytics";
import { buildStatsHref } from "@/shared/lib/constants/query-params";

type DashboardTrendPanelProps = {
  stats: DashboardStats;
  trend: DashboardTrendPoint[];
  range: DashboardAnalyticsRange;
  rangeLabel: string;
  isEmpty?: boolean;
};

export function DashboardTrendPanel({ stats, trend, range, rangeLabel, isEmpty = false }: DashboardTrendPanelProps) {
  if (range === "today") {
    return <TodayPacePanel stats={stats} />;
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

function TodayPacePanel({ stats }: { stats: DashboardStats }) {
  const pace = stats.todayPace;
  const hasAction =
    pace.completedCount > 0 || pace.inProgressCount > 0 || pace.dueTodayCount > 0 || pace.overdueCount > 0;
  const status =
    pace.overdueCount > 0
      ? "先处理逾期任务，再继续推进今天的安排。"
      : pace.completedCount > 0
        ? "已经完成一部分，继续收住正在推进的任务。"
        : pace.inProgressCount > 0
          ? "已有任务在推进，优先完成手上的一件事。"
          : "从优先处理列表中选择一项开始。";

  return (
    <section className="dashboard-v2-panel dashboard-v2-today-pace">
      <div className="dashboard-v2-panel__head">
        <div>
          <h2>今日任务节奏</h2>
          <p>只显示今天真实的执行信号。</p>
        </div>
        <Link href={buildStatsHref({ range: "today" })}>今日详情</Link>
      </div>
      <div className="dashboard-v2-today-pace__body">
        <div className={hasAction ? "dashboard-v2-today-pace__summary" : "dashboard-v2-today-pace__summary is-empty"}>
          <strong>{status}</strong>
          <span>{hasAction ? "已完成、状态与截止日期实时汇总" : "创建或安排任务后显示进度"}</span>
        </div>
        <div className="dashboard-v2-today-pace__signals" aria-label="今日任务信号">
          <Signal label="今日完成" value={pace.completedCount} tone="done" />
          <Signal label="进行中" value={pace.inProgressCount} tone="progress" />
          <Signal label="今天截止" value={pace.dueTodayCount} tone={pace.dueTodayCount > 0 ? "due" : "neutral"} />
          <Signal label="已逾期" value={pace.overdueCount} tone={pace.overdueCount > 0 ? "risk" : "neutral"} />
        </div>
      </div>
    </section>
  );
}
function Signal({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "done" | "progress" | "due" | "risk" | "neutral";
}) {
  return (
    <div className={"dashboard-v2-today-pace__signal dashboard-v2-today-pace__signal--" + tone}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getTrendTitle(range: DashboardAnalyticsRange) {
  return range === "week" ? "本周完成趋势" : "完成趋势";
}
