import { DashboardDistributionPanel } from "@/components/dashboard/v2/dashboard-distribution-panel";
import { DashboardFocusPanel } from "@/components/dashboard/v2/dashboard-focus-panel";
import { DashboardMetricGrid } from "@/components/dashboard/v2/dashboard-metric-grid";
import { DashboardRiskPanel } from "@/components/dashboard/v2/dashboard-risk-panel";
import { DashboardTrendPanel } from "@/components/dashboard/v2/dashboard-trend-panel";
import { DashboardV2Hero } from "@/components/dashboard/v2/dashboard-v2-hero";
import type { DashboardAnalyticsRange, DashboardStats } from "@/features/tasks/utils/task-analytics";

type DashboardV2ShellProps = {
  stats: DashboardStats;
  range: DashboardAnalyticsRange;
  rangeLabel: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  isAccountEmpty?: boolean;
  isSyncing?: boolean;
  isPreview?: boolean;
  totalTaskCount?: number;
  rangeOptions: Array<{ value: DashboardAnalyticsRange; label: string }>;
  onRangeChange: (range: DashboardAnalyticsRange) => void;
};

export function DashboardV2Shell({
  stats,
  range,
  rangeLabel,
  isLoading = false,
  isEmpty = false,
  isAccountEmpty = false,
  isSyncing = false,
  isPreview = false,
  totalTaskCount = 0,
  rangeOptions,
  onRangeChange,
}: DashboardV2ShellProps) {
  return (
    <section className="dashboard-v2-shell" aria-label="新版数据看板骨架">
      <DashboardV2Hero
        stats={stats}
        rangeLabel={rangeLabel}
        isEmpty={isEmpty}
        isAccountEmpty={isAccountEmpty}
        isSyncing={isSyncing}
        isPreview={isPreview}
        totalTaskCount={totalTaskCount}
      />
      <div className="dashboard-v2-range-row" aria-label="总览范围切换">
        <div className="dashboard-v2-range-tabs" role="tablist" aria-label="总览范围">
          {rangeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={range === option.value}
              className={range === option.value ? "is-active" : ""}
              onClick={() => onRangeChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span>{getRangeHint(range, stats.totalCount, totalTaskCount)}</span>
      </div>
      <DashboardMetricGrid metrics={stats.metrics} isLoading={isLoading} isEmpty={isEmpty} />
      <div className="dashboard-v2-grid">
        <div className="dashboard-v2-grid__main">
          <DashboardTrendPanel trend={stats.trend} range={range} rangeLabel={rangeLabel} isEmpty={isEmpty} />
          <DashboardDistributionPanel
            statusDistribution={stats.statusDistribution}
            priorityDistribution={stats.priorityDistribution}
            tagTop={stats.tagTop}
            range={range}
            rangeLabel={rangeLabel}
            isEmpty={isEmpty}
          />
        </div>
        <aside className="dashboard-v2-grid__aside">
          <DashboardFocusPanel tasks={stats.focusTasks} deadlines={stats.upcomingDeadlines} range={range} />
          <DashboardRiskPanel risks={stats.overdueRisk} overdueCount={stats.overdueCount} isEmpty={isEmpty} />
        </aside>
      </div>
    </section>
  );
}

function getRangeHint(range: DashboardAnalyticsRange, rangeCount: number, totalCount: number) {
  if (totalCount === 0) {
    return "暂无任务";
  }

  if (range === "today") {
    return `今日 ${rangeCount} 项 / 全部 ${totalCount} 项`;
  }

  if (range === "week") {
    return `本周 ${rangeCount} 项 / 全部 ${totalCount} 项`;
  }

  return `全部 ${totalCount} 项`;
}
