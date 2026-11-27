import dynamic from "next/dynamic";

import type {
  DashboardPriorityFilters,
  DashboardRangeOption,
} from "@/features/dashboard/components/dashboard-range-menu";
import { DashboardRangeMenu } from "@/features/dashboard/components/dashboard-range-menu";
import { DashboardWorkspace } from "@/features/dashboard/components/dashboard-workspace";
import { DashboardEmptyOrbit } from "@/features/dashboard/components/dashboard-empty-orbit";
import { DashboardDeadlinePanel } from "@/features/dashboard/components/dashboard-deadline-panel";
import { DashboardDistributionPanel } from "@/features/dashboard/components/dashboard-distribution-panel";
import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { DashboardAnalyticsRange, DashboardStats } from "@/features/tasks/utils/task-analytics";
import type { DashboardTaskPreview } from "@/features/tasks/utils/task-analytics";
import { PageToolbar } from "@/shared/components/layout/page-toolbar";
import { PageToolbarTemporalContext } from "@/shared/components/layout/page-toolbar-context";

const DashboardTrendPanel = dynamic(
  () => import("@/features/dashboard/components/dashboard-trend-panel").then((module) => module.DashboardTrendPanel),
  { loading: () => <DashboardDeferredPanelSkeleton label="趋势分析加载中" /> },
);

type DashboardV2ShellProps = {
  stats: DashboardStats;
  priorityTasks: DashboardStats["focusTasks"];
  orbitTasks?: DashboardStats["focusTasks"];
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
  onToggleTask: (task: DashboardTaskPreview) => Promise<void>;
  onStatusFilter: (filter: "active" | "in_progress" | "near") => void;
};

export function DashboardV2Shell({
  stats,
  priorityTasks,
  orbitTasks = priorityTasks,
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
  onToggleTask,
  onStatusFilter,
}: DashboardV2ShellProps) {
  const pageToolbar = (
    <DashboardToolbar
      stats={stats}
      range={range}
      rangeLabel={rangeLabel}
      isLoading={isLoading}
      rangeOptions={rangeOptions}
      onRangeChange={onRangeChange}
      priorityFilters={priorityFilters}
      onPriorityFiltersChange={onPriorityFiltersChange}
      onCreateTask={onCreateTask}
    />
  );

  if (isAccountEmpty) {
    return (
      <section className="dashboard-v2-shell dashboard-v2-shell--empty" aria-label="总览空状态">
        {pageToolbar}
        <DashboardEmptyOrbit tasks={orbitTasks} onPreviewTask={onPreviewTask} onCreateTask={onCreateTask} />
      </section>
    );
  }

  if (isEmpty) {
    return (
      <section className="dashboard-v2-shell dashboard-v2-shell--empty" aria-label="总览范围无数据">
        {pageToolbar}
        <DashboardWorkspace
          stats={stats}
          priorityTasks={priorityTasks}
          isLoading={isLoading}
          isRangeEmpty
          onPreviewTask={onPreviewTask}
          onToggleTask={onToggleTask}
          onStatusFilter={onStatusFilter}
        />
        <DashboardEmptyOrbit tasks={orbitTasks} onPreviewTask={onPreviewTask} onCreateTask={onCreateTask} />
      </section>
    );
  }

  return (
    <section className="dashboard-v2-shell" aria-label="新版数据看板骨架">
      {pageToolbar}
      <DashboardWorkspace
        stats={stats}
        priorityTasks={priorityTasks}
        isLoading={isLoading}
        onPreviewTask={onPreviewTask}
        onToggleTask={onToggleTask}
        onStatusFilter={onStatusFilter}
      />
      <div className="dashboard-v2-grid">
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
        <DashboardDeadlinePanel
          deadlines={stats.upcomingDeadlines}
          focusTasks={priorityTasks}
          overdueCount={stats.overdueCount}
          risks={stats.overdueRisk}
          range={range}
          isLoading={isLoading && !hasPreviousData}
          onPreviewTask={onPreviewTask}
        />
        <DashboardDistributionPanel
          statusDistribution={stats.statusDistribution}
          priorityDistribution={stats.priorityDistribution}
          tagTop={stats.tagTop}
          rangeLabel={rangeLabel}
          isLoading={isLoading && !hasPreviousData}
        />
      </div>
    </section>
  );
}

export function DashboardToolbar({
  stats,
  range,
  rangeLabel,
  isLoading,
  rangeOptions,
  onRangeChange,
  priorityFilters,
  onPriorityFiltersChange,
  onCreateTask,
}: Pick<
  DashboardV2ShellProps,
  | "stats"
  | "range"
  | "rangeLabel"
  | "isLoading"
  | "rangeOptions"
  | "onRangeChange"
  | "priorityFilters"
  | "onPriorityFiltersChange"
  | "onCreateTask"
>) {
  const hasRisk = !isLoading && stats.overdueCount > 0;
  const summary = isLoading
    ? "正在同步任务状态"
    : hasRisk
      ? `${stats.overdueCount} 项逾期需要处理`
      : stats.activeCount
        ? `待处理 ${stats.activeCount} 项 · 进行中 ${stats.inProgressCount} 项`
        : "当前范围任务已完成";

  return (
    <PageToolbar
      accessibleTitle="总览"
      className={hasRisk ? "dashboard-page-toolbar is-risk" : "dashboard-page-toolbar"}
      context={
        <div className="dashboard-toolbar__context">
          <div className="dashboard-toolbar__identity">
            <span className="dashboard-toolbar__eyebrow">FOCUS MODE</span>
            <strong>工作总览</strong>
          </div>
          <PageToolbarTemporalContext rangeLabel={rangeLabel} />
        </div>
      }
      controls={
        <div className="dashboard-toolbar__controls">
          <div className="dashboard-toolbar__signal" aria-live="polite">
            <span className={hasRisk ? "dashboard-toolbar__signal-dot is-risk" : "dashboard-toolbar__signal-dot"} />
            <span className="dashboard-toolbar__signal-summary">{summary}</span>
            <span className="dashboard-toolbar__meter" aria-label={`当前范围完成率 ${stats.completionRate}%`}>
              <span style={{ width: `${isLoading ? 0 : stats.completionRate}%` }} />
            </span>
          </div>
          <DashboardRangeMenu
            range={range}
            options={rangeOptions}
            onChange={onRangeChange}
            filters={priorityFilters}
            onFiltersChange={onPriorityFiltersChange}
          />
        </div>
      }
      primaryAction={
        <TaskFormDialog
          onSubmitTask={onCreateTask}
          triggerLabel="新建任务"
          triggerClassName="tesla-action tesla-action--primary page-toolbar__primary-action"
        />
      }
    />
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
