import Link from "next/link";

import { EChartsClient } from "@/components/charts/echarts-client";
import { buildTaskTrendOption } from "@/components/charts/task-chart-options";
import type { DashboardTrendPoint } from "@/features/tasks/utils/task-analytics";
import { buildStatsHref } from "@/lib/constants/query-params";

type DashboardTrendPanelProps = {
  trend: DashboardTrendPoint[];
  isEmpty?: boolean;
};

export function DashboardTrendPanel({ trend, isEmpty = false }: DashboardTrendPanelProps) {
  const hasTrendData = !isEmpty && trend.some((point) => point.completed > 0 || point.created > 0);
  const option = buildTaskTrendOption(trend);

  return (
    <section className="dashboard-v2-panel dashboard-v2-trend">
      <div className="dashboard-v2-panel__head">
        <h2>任务完成趋势</h2>
        <Link href={buildStatsHref({ range: "week" })}>近 7 天</Link>
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
            <p>完成任务后显示</p>
          </div>
        </div>
      )}
    </section>
  );
}
