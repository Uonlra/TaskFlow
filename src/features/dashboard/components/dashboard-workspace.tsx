import type { CSSProperties } from "react";

import { DashboardRangeMenu, type DashboardRangeOption } from "@/features/dashboard/components/dashboard-range-menu";
import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { DashboardAnalyticsRange, DashboardStats, DashboardTaskPreview } from "@/features/tasks/utils/task-analytics";

type DashboardWorkspaceProps = {
  stats: DashboardStats;
  rangeLabel: string;
  isLoading?: boolean;
  range: DashboardAnalyticsRange;
  rangeOptions: DashboardRangeOption[];
  onRangeChange: (range: DashboardAnalyticsRange) => void;
  onCreateTask: (values: TaskFormValues) => Promise<void>;
};

export function DashboardWorkspace({
  stats,
  rangeLabel,
  isLoading = false,
  range,
  rangeOptions,
  onRangeChange,
  onCreateTask,
}: DashboardWorkspaceProps) {
  const progress = stats.totalCount ? Math.round((stats.completedCount / stats.totalCount) * 360) : 0;

  return (
    <>
      <section className="dashboard-workspace" aria-label="今日工作区">
        <section className="dashboard-workspace__priority">
          <div className="dashboard-workspace__head dashboard-workspace__head--toolbar">
            <div>
              <h1>优先处理</h1>
              <p>{rangeLabel}先完成最重要的几件事。</p>
            </div>
            <DashboardRangeMenu range={range} options={rangeOptions} onChange={onRangeChange} />
          </div>

          {stats.focusTasks.length ? (
            <div className="dashboard-workspace__task-list">
              {stats.focusTasks.map((task) => <PriorityTaskRow key={task.id} task={task} />)}
            </div>
          ) : (
            <div className="dashboard-workspace__empty">
              <strong>暂无待处理任务</strong>
              <p>当前范围内的任务会显示在这里。</p>
            </div>
          )}

          <TaskFormDialog onSubmitTask={onCreateTask} triggerLabel="添加任务" triggerClassName="dashboard-workspace__add-task" />
        </section>

        <section className="dashboard-workspace__progress" aria-label="今日进度">
          <div className="dashboard-workspace__head">
            <h2>今日进度</h2>
            <span className={stats.overdueCount > 0 ? "is-risk" : ""}>
              {stats.overdueCount > 0 ? "需要关注" : "节奏稳定"}
            </span>
          </div>
          <div className="dashboard-workspace__progress-body">
            <div className="dashboard-workspace__progress-visual">
              <div
                className="dashboard-workspace__ring"
                style={{ "--dashboard-progress": String(isLoading ? 0 : progress) + "deg" } as CSSProperties}
                aria-hidden="true"
              >
                <strong>{isLoading ? "--" : String(stats.completionRate) + "%"}</strong>
              </div>
              <p>目标完成 {isLoading ? "--" : stats.totalCount} 个任务</p>
            </div>
            <div className="dashboard-workspace__progress-copy">
              <div>
                <span>完成数</span>
                <strong>{isLoading ? "--" : String(stats.completedCount) + " / " + String(stats.totalCount)}</strong>
              </div>
              <div className="dashboard-workspace__progress-overdue">
                <span>逾期任务</span>
                <strong>{isLoading ? "--" : stats.overdueCount}</strong>
              </div>
            </div>
          </div>
        </section>
      </section>

      <section className="dashboard-workspace__status-grid" aria-label="任务状态概览">
        <Metric label="待处理" value={stats.activeCount} helper="未完成" />
        <Metric label="进行中" value={stats.inProgressCount} helper="正在推进" />
        <Metric label="临近截止" value={stats.upcomingCount} helper="3 天内" tone={stats.upcomingCount > 0 ? "warning" : undefined} />
      </section>
    </>
  );
}

function PriorityTaskRow({ task }: { task: DashboardTaskPreview }) {
  const className = ["dashboard-workspace__task", "dashboard-workspace__task--" + task.priority].join(" ");

  return (
    <a href={"/tasks/" + task.id} className={className}>
      <span className="dashboard-workspace__check" aria-hidden="true" />
      <strong>{task.title}</strong>
      <span className="dashboard-workspace__priority-label">{priorityLabels[task.priority]}优先级</span>
      <time>{task.dueLabel}</time>
      <span className={["dashboard-workspace__status", "dashboard-workspace__status--" + task.status].join(" ")}>
        {statusLabels[task.status]}
      </span>
    </a>
  );
}

function Metric({ label, value, helper, tone }: { label: string; value: number; helper: string; tone?: "warning" }) {
  const className = tone ? "dashboard-workspace__metric dashboard-workspace__metric--" + tone : "dashboard-workspace__metric";

  return <div className={className}><span>{label}</span><strong>{value}</strong><small>{helper}</small></div>;
}

const priorityLabels: Record<DashboardTaskPreview["priority"], string> = { high: "高", medium: "中", low: "低" };
const statusLabels: Record<DashboardTaskPreview["status"], string> = { todo: "待处理", in_progress: "进行中", done: "已完成" };
