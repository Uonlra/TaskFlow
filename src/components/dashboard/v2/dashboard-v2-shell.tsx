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
  isEmpty?: boolean;
  isPreview?: boolean;
};

export function DashboardV2Shell({
  stats,
  rangeLabel,
  isLoading = false,
  isEmpty = false,
  isPreview = false,
}: DashboardV2ShellProps) {
  return (
    <section className="dashboard-v2-shell" aria-label="新版数据看板骨架">
      <DashboardV2Hero stats={stats} rangeLabel={rangeLabel} isEmpty={isEmpty} isPreview={isPreview} />
      <DashboardMetricGrid metrics={stats.metrics} isLoading={isLoading} isEmpty={isEmpty} />
      <div className="dashboard-v2-grid">
        <div className="dashboard-v2-grid__main">
          <DashboardTrendPanel trend={stats.trend} isEmpty={isEmpty} />
          <DashboardDistributionPanel
            statusDistribution={stats.statusDistribution}
            priorityDistribution={stats.priorityDistribution}
            tagTop={stats.tagTop}
            isEmpty={isEmpty}
          />
        </div>
        <aside className="dashboard-v2-grid__aside">
          <DashboardFocusPanel tasks={stats.focusTasks} deadlines={stats.upcomingDeadlines} />
          <DashboardRiskPanel risks={stats.overdueRisk} overdueCount={stats.overdueCount} isEmpty={isEmpty} />
        </aside>
      </div>
    </section>
  );
}
