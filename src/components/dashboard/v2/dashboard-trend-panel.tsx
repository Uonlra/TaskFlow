import type { DashboardTrendPoint } from "@/features/tasks/utils/task-analytics";

type DashboardTrendPanelProps = {
  trend: DashboardTrendPoint[];
};

export function DashboardTrendPanel({ trend }: DashboardTrendPanelProps) {
  const maxValue = Math.max(1, ...trend.map((point) => Math.max(point.completed, point.created)));

  return (
    <section className="dashboard-v2-panel dashboard-v2-trend">
      <div className="dashboard-v2-panel__head">
        <h2>任务完成趋势</h2>
        <span>近 7 天</span>
      </div>
      <div className="dashboard-v2-chart-placeholder" aria-label="ECharts 趋势图占位">
        {trend.map((point) => (
          <div key={point.date} className="dashboard-v2-trend__bar">
            <span style={{ height: `${Math.max(8, (point.completed / maxValue) * 100)}%` }} />
            <small>{point.label}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
