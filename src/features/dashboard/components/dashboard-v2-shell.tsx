import { DashboardDistributionPanel } from "@/features/dashboard/components/dashboard-distribution-panel";
import { DashboardFocusPanel } from "@/features/dashboard/components/dashboard-focus-panel";
import type { DashboardPriorityFilters, DashboardRangeOption } from "@/features/dashboard/components/dashboard-range-menu";
import { DashboardRiskPanel } from "@/features/dashboard/components/dashboard-risk-panel";
import { DashboardTrendPanel } from "@/features/dashboard/components/dashboard-trend-panel";
import { DashboardWorkspace } from "@/features/dashboard/components/dashboard-workspace";
import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import { DataEmptyState } from "@/shared/components/common/data-empty-state";
import type { DashboardAnalyticsRange, DashboardStats } from "@/features/tasks/utils/task-analytics";

type DashboardV2ShellProps = {
  stats: DashboardStats;
  priorityTasks: DashboardStats["focusTasks"];
  range: DashboardAnalyticsRange;
  rangeLabel: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  isAccountEmpty?: boolean;
  rangeOptions: DashboardRangeOption[];
  onRangeChange: (range: DashboardAnalyticsRange) => void;
  priorityFilters: DashboardPriorityFilters;
  onPriorityFiltersChange: (filters: DashboardPriorityFilters) => void;
  onCreateTask: (values: TaskFormValues) => Promise<void>;
};

export function DashboardV2Shell({
  stats,
  priorityTasks,
  range,
  rangeLabel,
  isLoading = false,
  isEmpty = false,
  isAccountEmpty = false,
  rangeOptions,
  onRangeChange,
  priorityFilters,
  onPriorityFiltersChange,
  onCreateTask,
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
      />
      <div className="dashboard-v2-grid">
        <div className="dashboard-v2-grid__main">
          <DashboardTrendPanel
            stats={stats}
            trend={stats.trend}
            range={range}
            rangeLabel={rangeLabel}
            isEmpty={isEmpty}
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
          />
          <DashboardRiskPanel
            risks={stats.overdueRisk}
            overdueCount={stats.overdueCount}
            isEmpty={isEmpty}
          />
        </aside>
      </div>
    </section>
  );
}
