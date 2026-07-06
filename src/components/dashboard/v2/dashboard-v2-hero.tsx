import type { DashboardStats } from "@/features/tasks/utils/task-analytics";

type DashboardV2HeroProps = {
  stats: DashboardStats;
  rangeLabel: string;
};

export function DashboardV2Hero({ stats, rangeLabel }: DashboardV2HeroProps) {
  return (
    <section className="dashboard-v2-hero">
      <div className="dashboard-v2-hero__copy">
        <p className="dashboard-v2-kicker">任务数据看板</p>
        <h1>{rangeLabel}总览</h1>
        <p>{stats.activeCount} 项待处理，完成率 {stats.completionRate}%</p>
      </div>

      <div className="dashboard-v2-scene" aria-label="3D 数据网络占位">
        <span className="dashboard-v2-scene__node dashboard-v2-scene__node--blue" />
        <span className="dashboard-v2-scene__node dashboard-v2-scene__node--green" />
        <span className="dashboard-v2-scene__node dashboard-v2-scene__node--orange" />
        <span className="dashboard-v2-scene__line dashboard-v2-scene__line--one" />
        <span className="dashboard-v2-scene__line dashboard-v2-scene__line--two" />
        <div className="dashboard-v2-floating-card">
          <span>完成率</span>
          <strong>{stats.completionRate}%</strong>
        </div>
        <div className="dashboard-v2-floating-card dashboard-v2-floating-card--secondary">
          <span>风险</span>
          <strong>{stats.overdueCount}</strong>
        </div>
      </div>
    </section>
  );
}
