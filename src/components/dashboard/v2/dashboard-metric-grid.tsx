import type { DashboardMetric } from "@/features/tasks/utils/task-analytics";

type DashboardMetricGridProps = {
  metrics: DashboardMetric[];
  isLoading?: boolean;
};

export function DashboardMetricGrid({ metrics, isLoading = false }: DashboardMetricGridProps) {
  return (
    <section className="dashboard-v2-metrics" aria-label="任务指标">
      {metrics.map((metric) => (
        <article key={metric.id} className={`dashboard-v2-metric dashboard-v2-metric--${metric.tone}`}>
          <span className="dashboard-v2-metric__icon" aria-hidden="true" />
          <div>
            <p>{metric.label}</p>
            <strong>{isLoading ? "--" : metric.value}</strong>
            <small>{metric.helper}</small>
          </div>
        </article>
      ))}
    </section>
  );
}
