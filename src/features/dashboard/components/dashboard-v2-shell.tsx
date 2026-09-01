import dynamic from "next/dynamic";

import type {
  DashboardPriorityFilters,
  DashboardRangeOption,
} from "@/features/dashboard/components/dashboard-range-menu";
import { DashboardWorkspace } from "@/features/dashboard/components/dashboard-workspace";
import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import { DataEmptyState } from "@/shared/components/common/data-empty-state";
import type { DashboardAnalyticsRange, DashboardStats } from "@/features/tasks/utils/task-analytics";
import type { DashboardTaskPreview } from "@/features/tasks/utils/task-analytics";

const DashboardTrendPanel = dynamic(
  () => import("@/features/dashboard/components/dashboard-trend-panel").then((module) => module.DashboardTrendPanel),
  { loading: () => <DashboardDeferredPanelSkeleton label="趋势分析加载中" /> },
);
const DashboardDistributionPanel = dynamic(
  () =>
    import("@/features/dashboard/components/dashboard-distribution-panel").then(
      (module) => module.DashboardDistributionPanel,
    ),
  { loading: () => <DashboardDeferredPanelSkeleton label="分布分析加载中" /> },
);
const DashboardFocusPanel = dynamic(
  () => import("@/features/dashboard/components/dashboard-focus-panel").then((module) => module.DashboardFocusPanel),
  { loading: () => <DashboardDeferredPanelSkeleton label="重点任务加载中" /> },
);
const DashboardRiskPanel = dynamic(
  () => import("@/features/dashboard/components/dashboard-risk-panel").then((module) => module.DashboardRiskPanel),
  { loading: () => <DashboardDeferredPanelSkeleton label="风险分析加载中" /> },
);

type DashboardV2ShellProps = {
  stats: DashboardStats;
  priorityTasks: DashboardStats["focusTasks"];
  range: DashboardAnalyticsRange;
  rangeLabel: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  error?: string | null;
  onRetry?: () => void;
  hasPreviousData?: boolean;
  isAccountEmpty?: boolean;
  rangeOptions: DashboardRangeOption[];
  onRangeChange: (range: DashboardAnalyticsRange) => void;
  priorityFilters: DashboardPriorityFilters;
  onPriorityFiltersChange: (filters: DashboardPriorityFilters) => void;
  onCreateTask: (values: TaskFormValues) => Promise<void>;
  onPreviewTask: (task: DashboardTaskPreview) => void;
  onStatusFilter: (filter: "active" | "in_progress" | "near") => void;
};

export function DashboardV2Shell({
  stats,
  priorityTasks,
  range,
  rangeLabel,
  isLoading = false,
  isEmpty = false,
  error = null,
  onRetry,
  hasPreviousData = false,
  isAccountEmpty = false,
  rangeOptions,
  onRangeChange,
  priorityFilters,
  onPriorityFiltersChange,
  onCreateTask,
  onPreviewTask,
  onStatusFilter,
}: DashboardV2ShellProps) {
  if (isAccountEmpty) {
    return (
      <section className="dashboard-v2-shell dashboard-v2-shell--empty" aria-label="总览空状态">
        <DataEmptyState
          title="从第一条任务开始"
          description="创建任务后，这里会汇总进度、截止和风险。"
          action={<TaskFormDialog onSubmitTask={onCreateTask} triggerLabel="创建任务" />}
        />
      </section>
    );
  }

  if (isEmpty) {
    return (
      <section className="dashboard-v2-shell dashboard-v2-shell--empty" aria-label="总览范围无数据">
        <DashboardWorkspace
          stats={stats}
          priorityTasks={priorityTasks}
          rangeLabel={rangeLabel}
          isLoading={isLoading}
          range={range}
          rangeOptions={rangeOptions}
          onRangeChange={onRangeChange}
          priorityFilters={priorityFilters}
          onPriorityFiltersChange={onPriorityFiltersChange}
          onCreateTask={onCreateTask}
          onPreviewTask={onPreviewTask}
          onStatusFilter={onStatusFilter}
        />
        <DataEmptyState
          variant="table"
          title={rangeLabel + "暂无任务"}
          description="切换范围，或创建一条任务后再查看数据。"
        />
      </section>
    );
  }

  return (
    <section className="dashboard-v2-shell" aria-label="新版数据看板骨架">
      <DashboardWorkspace
        stats={stats}
        priorityTasks={priorityTasks}
        rangeLabel={rangeLabel}
        isLoading={isLoading}
        range={range}
        rangeOptions={rangeOptions}
        onRangeChange={onRangeChange}
        priorityFilters={priorityFilters}
        onPriorityFiltersChange={onPriorityFiltersChange}
        onCreateTask={onCreateTask}
        onPreviewTask={onPreviewTask}
        onStatusFilter={onStatusFilter}
      />
      <div className="dashboard-v2-grid">
        <div className="dashboard-v2-grid__main">
          <DashboardTrendPanel
            stats={stats}
            trend={stats.trend}
            range={range}
            rangeLabel={rangeLabel}
            isEmpty={isEmpty}
            isLoading={isLoading}
            error={error}
            onRetry={onRetry}
            hasPreviousData={hasPreviousData}
          />
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
          <DashboardFocusPanel
            tasks={stats.focusTasks}
            deadlines={stats.upcomingDeadlines}
            range={range}
            showFocus={false}
            onPreviewTask={onPreviewTask}
          />
          <DashboardRiskPanel risks={stats.overdueRisk} overdueCount={stats.overdueCount} isEmpty={isEmpty} />
        </aside>
      </div>
    </section>
  );
}

function DashboardDeferredPanelSkeleton({ label }: { label: string }) {
  return (
    <section className="dashboard-v2-panel dashboard-v2-panel--deferred" aria-label={label} aria-busy="true">
      <div className="dashboard-v2-panel__head">
        <span className="dashboard-skeleton dashboard-skeleton--heading" />
        <span className="dashboard-skeleton dashboard-skeleton--link" />
      </div>
      <div className="dashboard-skeleton dashboard-skeleton--panel" />
    </section>
  );
}
