import Link from "next/link";

import { DashboardDistributionPanel } from "@/features/dashboard/components/dashboard-distribution-panel";
import { DashboardFocusPanel } from "@/features/dashboard/components/dashboard-focus-panel";
import { DashboardMetricGrid } from "@/features/dashboard/components/dashboard-metric-grid";
import { DashboardRiskPanel } from "@/features/dashboard/components/dashboard-risk-panel";
import { DashboardTrendPanel } from "@/features/dashboard/components/dashboard-trend-panel";
import { DashboardV2Hero } from "@/features/dashboard/components/dashboard-v2-hero";
import { DataEmptyState } from "@/shared/components/common/data-empty-state";
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
  if (isAccountEmpty) {
    return (
      <section className="dashboard-v2-shell dashboard-v2-shell--empty" aria-label="总览空状态">
        <DataEmptyState
          title="从第一条任务开始"
          description="创建任务后，这里会汇总进度、截止和风险。"
          action={<Link href="/tasks">创建任务</Link>}
        />
      </section>
    );
  }

  if (isEmpty) {
    return (
      <section className="dashboard-v2-shell dashboard-v2-shell--empty" aria-label="总览范围无数据">
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
        <DataEmptyState
          variant="table"
          title={`${rangeLabel}暂无任务`}
          description="切换范围，或创建一条任务后再查看数据。"
        />
      </section>
    );
  }

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
