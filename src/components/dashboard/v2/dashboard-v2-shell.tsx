import { DashboardDistributionPanel } from "@/components/dashboard/v2/dashboard-distribution-panel";
import { DashboardFocusPanel } from "@/components/dashboard/v2/dashboard-focus-panel";
import { DashboardMetricGrid } from "@/components/dashboard/v2/dashboard-metric-grid";
import { DashboardRiskPanel } from "@/components/dashboard/v2/dashboard-risk-panel";
import { DashboardTrendPanel } from "@/components/dashboard/v2/dashboard-trend-panel";
import { DashboardV2Hero } from "@/components/dashboard/v2/dashboard-v2-hero";
import type { DashboardStats } from "@/features/tasks/utils/task-analytics";

type DashboardV2ShellProps = {
  stats: DashboardStats;
  rangeLabel: string;
  isLoading?: boolean;
};

export function DashboardV2Shell({ stats, rangeLabel, isLoading = false }: DashboardV2ShellProps) {
  return (
    <section className="dashboard-v2-shell" aria-label="新版数据看板骨架">
      <DashboardV2Hero stats={stats} rangeLabel={rangeLabel} />
      <DashboardMetricGrid metrics={stats.metrics} isLoading={isLoading} />
      <div className="dashboard-v2-grid">
        <div className="dashboard-v2-grid__main">
          <DashboardTrendPanel trend={stats.trend} />
          <DashboardDistributionPanel
            statusDistribution={stats.statusDistribution}
            priorityDistribution={stats.priorityDistribution}
            tagTop={stats.tagTop}
          />
        </div>
        <aside className="dashboard-v2-grid__aside">
          <DashboardFocusPanel tasks={stats.focusTasks} deadlines={stats.upcomingDeadlines} />
          <DashboardRiskPanel risks={stats.overdueRisk} overdueCount={stats.overdueCount} />
        </aside>
      </div>
    </section>
  );
}
