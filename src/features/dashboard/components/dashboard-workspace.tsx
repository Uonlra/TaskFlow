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

          {priorityTasks.length ? (
            <div className="dashboard-workspace__task-list">
              {priorityTasks.map((task) => (
                <PriorityTaskRow key={task.id} task={task} />
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

      <section className="dashboard-workspace__status-grid" aria-label="任务状态概览">
        <Metric label="待处理" value={stats.activeCount} helper="未完成" icon="todo" />
        <Metric label="进行中" value={stats.inProgressCount} helper="正在推进" icon="progress" />
        <Metric
          label="临近截止"
          value={stats.upcomingCount}
          helper="3 天内"
          icon="deadline"
          tone={stats.upcomingCount > 0 ? "warning" : undefined}
        />
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

function Metric({
  label,
  value,
  helper,
  icon,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  icon: "todo" | "progress" | "deadline";
  tone?: "warning";
}) {
  const className = tone
    ? "dashboard-workspace__metric dashboard-workspace__metric--" + tone
    : "dashboard-workspace__metric";

  return (
    <div className={className}>
      <span className={"dashboard-workspace__metric-icon dashboard-workspace__metric-icon--" + icon} aria-hidden="true">
        {icon === "todo" ? <CheckSquare /> : icon === "progress" ? <Play /> : <Clock3 />}
      </span>
      <div className="dashboard-workspace__metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{helper}</small>
      </div>
    </div>
  );
}

const priorityLabels: Record<DashboardTaskPreview["priority"], string> = { high: "高", medium: "中", low: "低" };
const statusLabels: Record<DashboardTaskPreview["status"], string> = {
  todo: "待处理",
  in_progress: "进行中",
  done: "已完成",
};
