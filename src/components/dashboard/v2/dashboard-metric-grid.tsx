import type { DashboardMetric } from "@/features/tasks/utils/task-analytics";

type DashboardMetricGridProps = {
  metrics: DashboardMetric[];
  isLoading?: boolean;
  isEmpty?: boolean;
};

export function DashboardMetricGrid({ metrics, isLoading = false, isEmpty = false }: DashboardMetricGridProps) {
  return (
    <section className="dashboard-v2-metrics" aria-label="任务指标">
      {metrics.map((metric) => (
        <article
          key={metric.id}
          className={`dashboard-v2-metric dashboard-v2-metric--${metric.tone}${isEmpty ? " dashboard-v2-metric--empty" : ""}`}
        >
          <span className="dashboard-v2-metric__icon" aria-hidden="true" />
          <div>
            <p>{metric.label}</p>
            <strong>{isLoading ? "--" : metric.value}</strong>
            <small>{isEmpty ? "当前范围" : metric.helper}</small>
          </div>
        </article>
      ))}
    </section>
  );
}
