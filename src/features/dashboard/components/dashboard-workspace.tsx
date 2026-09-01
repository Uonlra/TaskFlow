import type { CSSProperties } from "react";
import { CheckSquare, Clock3, Play } from "lucide-react";

import {
  DashboardRangeMenu,
  type DashboardPriorityFilters,
  type DashboardRangeOption,
} from "@/features/dashboard/components/dashboard-range-menu";
import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type {
  DashboardAnalyticsRange,
  DashboardStats,
  DashboardTaskPreview,
} from "@/features/tasks/utils/task-analytics";

type DashboardWorkspaceProps = {
  stats: DashboardStats;
  priorityTasks: DashboardTaskPreview[];
  rangeLabel: string;
  isLoading?: boolean;
  range: DashboardAnalyticsRange;
  rangeOptions: DashboardRangeOption[];
  onRangeChange: (range: DashboardAnalyticsRange) => void;
  priorityFilters: DashboardPriorityFilters;
  onPriorityFiltersChange: (filters: DashboardPriorityFilters) => void;
  onCreateTask: (values: TaskFormValues) => Promise<void>;
  onStatusFilter: (filter: "active" | "in_progress" | "near") => void;
  onPreviewTask: (task: DashboardTaskPreview) => void;
};

export function DashboardWorkspace({
  stats,
  priorityTasks,
  rangeLabel,
  isLoading = false,
  range,
  rangeOptions,
  onRangeChange,
  priorityFilters,
  onPriorityFiltersChange,
  onCreateTask,
  onPreviewTask,
  onStatusFilter,
}: DashboardWorkspaceProps) {
  const progress = stats.totalCount ? Math.round((stats.completedCount / stats.totalCount) * 360) : 0;
  const remainingCount = Math.max(stats.totalCount - stats.completedCount, 0);

  return (
    <>
      <section className="dashboard-workspace" aria-label="今日工作区">
        <section className="dashboard-workspace__priority">
          <div className="dashboard-workspace__head dashboard-workspace__head--toolbar">
            <div>
              <h1>优先处理</h1>
              <p>{rangeLabel}先完成最重要的几件事。</p>
            </div>
            <DashboardRangeMenu
              range={range}
              options={rangeOptions}
              onChange={onRangeChange}
              filters={priorityFilters}
              onFiltersChange={onPriorityFiltersChange}
            />
          </div>

          {isLoading && !priorityTasks.length ? (
            <div className="dashboard-workspace__task-list dashboard-workspace__task-list--skeleton" aria-busy="true">
              {Array.from({ length: 3 }, (_, index) => (
                <span className="dashboard-workspace__task-skeleton" key={index} />
              ))}
            </div>
          ) : priorityTasks.length ? (
            <div className="dashboard-workspace__task-list">
              {priorityTasks.map((task) => (
                <PriorityTaskRow key={task.id} task={task} onPreviewTask={onPreviewTask} />
              ))}
            </div>
          ) : (
            <div className="dashboard-workspace__empty">
              <strong>暂无待处理任务</strong>
              <p>当前范围内的任务会显示在这里。</p>
            </div>
          )}

          <TaskFormDialog
            onSubmitTask={onCreateTask}
            triggerLabel="+ 添加今日任务"
            triggerClassName="dashboard-workspace__add-task"
          />
        </section>

        <section className="dashboard-workspace__progress" aria-label="今日进度">
          <div className="dashboard-workspace__head">
            <h2>今日进度</h2>
          </div>
          <div className="dashboard-workspace__progress-body" aria-busy={isLoading}>
            <div className="dashboard-workspace__progress-visual">
              <div
                className="dashboard-workspace__ring"
                style={{ "--dashboard-progress": String(isLoading ? 0 : progress) + "deg" } as CSSProperties}
                aria-hidden="true"
              >
                <strong>{isLoading ? "--" : String(stats.completionRate) + "%"}</strong>
              </div>
              <p>{isLoading ? "正在加载任务" : `目标完成 ${stats.totalCount} 个任务`}</p>
            </div>
            <div className="dashboard-workspace__progress-main">
              <span>完成数</span>
              <strong>{isLoading ? "--" : String(stats.completedCount) + " / " + String(stats.totalCount)}</strong>
              <p>
                {isLoading
                  ? "正在汇总今日任务"
                  : remainingCount > 0
                    ? "还剩 " + String(remainingCount) + " 项待完成"
                    : "今日任务已全部完成"}
              </p>
            </div>
          </div>
          <div className="dashboard-workspace__progress-overdue" aria-label="逾期任务">
            <span>逾期任务</span>
            <strong>{isLoading ? "--" : stats.overdueCount}</strong>
          </div>
        </section>
      </section>

      <section className="dashboard-workspace__status-grid" aria-label="任务状态概览" aria-busy={isLoading}>
        <Metric
          label="待处理"
          value={isLoading ? "--" : stats.activeCount}
          helper="未完成任务"
          progress={getMetricProgress(stats.activeCount, stats.totalCount, isLoading)}
          icon="todo"
          onClick={() => onStatusFilter("active")}
        />
        <Metric
          label="进行中"
          value={isLoading ? "--" : stats.inProgressCount}
          helper="正在推进"
          progress={getMetricProgress(stats.inProgressCount, stats.totalCount, isLoading)}
          icon="progress"
          onClick={() => onStatusFilter("in_progress")}
        />
        <Metric
          label="临近截止"
          value={isLoading ? "--" : stats.upcomingCount}
          helper="3 天内到期"
          progress={getMetricProgress(stats.upcomingCount, stats.totalCount, isLoading)}
          icon="deadline"
          tone={stats.upcomingCount > 0 ? "warning" : undefined}
          onClick={() => onStatusFilter("near")}
        />
      </section>
    </>
  );
}

function PriorityTaskRow({
  task,
  onPreviewTask,
}: {
  task: DashboardTaskPreview;
  onPreviewTask: (task: DashboardTaskPreview) => void;
}) {
  const className = ["dashboard-workspace__task", "dashboard-workspace__task--" + task.priority].join(" ");

  return (
    <button type="button" className={className} onClick={() => onPreviewTask(task)}>
      <span className="dashboard-workspace__check" aria-hidden="true" />
      <strong>{task.title}</strong>
      <span className="dashboard-workspace__priority-label">{priorityLabels[task.priority]}优先级</span>
      <time>{task.dueLabel}</time>
      <span className={["dashboard-workspace__status", "dashboard-workspace__status--" + task.status].join(" ")}>
        {statusLabels[task.status]}
      </span>
    </button>
  );
}

function Metric({
  label,
  value,
  helper,
  icon,
  tone,
  onClick,
  progress,
}: {
  label: string;
  value: number | string;
  helper: string;
  icon: "todo" | "progress" | "deadline";
  tone?: "warning";
  onClick: () => void;
  progress: number;
}) {
  const className = [
    "dashboard-workspace__metric",
    "dashboard-workspace__metric--" + icon,
    tone ? "dashboard-workspace__metric--" + tone : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="button" className={className} onClick={onClick} aria-label={`${label} ${value}，${helper}`}>
      <span className={"dashboard-workspace__metric-icon dashboard-workspace__metric-icon--" + icon} aria-hidden="true">
        {icon === "todo" ? <CheckSquare /> : icon === "progress" ? <Play /> : <Clock3 />}
      </span>
      <div className="dashboard-workspace__metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{helper}</small>
      </div>
      <span className="dashboard-workspace__metric-bar" aria-hidden="true">
        <span className="dashboard-workspace__metric-bar-fill" style={{ width: `${progress}%` }} />
      </span>
    </button>
  );
}

function getMetricProgress(value: number, total: number, isLoading: boolean) {
  if (isLoading || total <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((value / total) * 100));
}

const priorityLabels: Record<DashboardTaskPreview["priority"], string> = { high: "高", medium: "中", low: "低" };
const statusLabels: Record<DashboardTaskPreview["status"], string> = {
  todo: "待处理",
  in_progress: "进行中",
  done: "已完成",
};
