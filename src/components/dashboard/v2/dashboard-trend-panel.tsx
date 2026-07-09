import Link from "next/link";

import { EChartsClient } from "@/components/charts/echarts-client";
import { buildTaskTrendOption } from "@/components/charts/task-chart-options";
import type { DashboardAnalyticsRange, DashboardTrendPoint } from "@/features/tasks/utils/task-analytics";
import { buildStatsHref } from "@/lib/constants/query-params";

type DashboardTrendPanelProps = {
  trend: DashboardTrendPoint[];
  range: DashboardAnalyticsRange;
  rangeLabel: string;
  isEmpty?: boolean;
};

export function DashboardTrendPanel({ trend, range, rangeLabel, isEmpty = false }: DashboardTrendPanelProps) {
  const hasTrendData = !isEmpty && trend.some((point) => point.completed > 0 || point.created > 0);
  const dataPointCount = trend.filter((point) => point.completed > 0 || point.created > 0).length;
  const option = buildTaskTrendOption(trend, {
    sparse: dataPointCount <= 1,
  });

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
        <div className="dashboard-v2-empty-chart" aria-label="暂无趋势">
          <div className="dashboard-v2-empty-chart__grid">
            {trend.map((point, index) => (
              <span key={point.date} style={{ opacity: 0.35 + index * 0.07 }} />
            ))}
          </div>
          <div>
            <strong>暂无趋势</strong>
            <p>{rangeLabel}完成任务后显示</p>
          </div>
        </div>
      )}
    </section>
  );
}

function getTrendTitle(range: DashboardAnalyticsRange) {
  if (range === "today") {
    return "今日趋势";
  }

  if (range === "week") {
    return "本周趋势";
  }

  return "全部趋势";
}
