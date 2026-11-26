import Link from "next/link";
import { useState } from "react";
import { Check, CheckSquare, Clock3, Play } from "lucide-react";

import type { DashboardStats, DashboardTaskPreview } from "@/features/tasks/utils/task-analytics";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";
import { buildTaskEvolutionHref } from "@/features/tasks/utils/task-evolution-navigation";

type DashboardWorkspaceProps = {
  stats: DashboardStats;
  priorityTasks: DashboardTaskPreview[];
  isLoading?: boolean;
  isRangeEmpty?: boolean;
  onStatusFilter: (filter: "active" | "in_progress" | "near") => void;
  onPreviewTask: (task: DashboardTaskPreview) => void;
  onToggleTask: (task: DashboardTaskPreview) => Promise<void>;
};

const progressTitles = { today: "今日进度", week: "本周进度", all: "全部任务进度" };

export function DashboardWorkspace({
  stats,
  priorityTasks,
  isLoading = false,
  isRangeEmpty = false,
  onPreviewTask,
  onToggleTask,
  onStatusFilter,
}: DashboardWorkspaceProps) {
  const useCompactEmptyState = isRangeEmpty && !isLoading && !priorityTasks.length;
  const progressTitle = progressTitles[stats.range];

  return (
    <>
      <section
        className={useCompactEmptyState ? "dashboard-workspace dashboard-workspace--empty" : "dashboard-workspace"}
        aria-label="任务工作区"
      >
        <section
          className={
            useCompactEmptyState
              ? "dashboard-workspace__priority dashboard-workspace__priority--empty"
              : "dashboard-workspace__priority"
          }
        >
          <div className="dashboard-workspace__head dashboard-workspace__head--toolbar">
            <h2>优先处理</h2>
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
                <PriorityTaskRow key={task.id} task={task} onPreviewTask={onPreviewTask} onToggleTask={onToggleTask} />
              ))}
            </div>
          ) : (
            <div className="dashboard-workspace__empty">
              <strong>暂无待处理任务</strong>
            </div>
          )}
        </section>

        <section className="dashboard-workspace__progress" aria-label={progressTitle}>
          <div className="dashboard-workspace__head">
            <h2>{progressTitle}</h2>
          </div>
          <div className="dashboard-workspace__progress-body" aria-busy={isLoading}>
            {isLoading ? (
              <p className="dashboard-workspace__progress-note" role="status">
                正在加载进度…
              </p>
            ) : (
              <p className="dashboard-workspace__progress-count">
                已完成{" "}
                <strong>
                  {stats.completedCount} / {stats.totalCount}
                </strong>
              </p>
            )}
            <progress
              className="dashboard-workspace__progress-track"
              aria-label={progressTitle}
              aria-hidden={isLoading || stats.totalCount === 0}
              max={Math.max(1, stats.totalCount)}
              value={isLoading ? 0 : stats.completedCount}
            />
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
  onToggleTask,
}: {
  task: DashboardTaskPreview;
  onPreviewTask: (task: DashboardTaskPreview) => void;
  onToggleTask: (task: DashboardTaskPreview) => Promise<void>;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const isDone = task.status === "done";
  const due = getTaskDueMeta(task);
  const dueLabel = isDone
    ? (task.dueDate ?? "未设截止")
    : due.isDueToday
      ? "今日到期"
      : task.dueDate
        ? due.label
        : "未设截止";
  const dueClass = due.isOverdue ? " is-overdue" : due.isDueToday ? " is-due-today" : "";

  const handleToggle = async () => {
    setIsUpdating(true);
    try {
      await onToggleTask(task);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="dashboard-workspace__task">
      {task.hasEvolution ? (
        <Link
          className="dashboard-workspace__review"
          href={buildTaskEvolutionHref(task.id)}
          aria-label={`${isDone ? "重新打开" : "验收"}：${task.title}`}
        >
          {isDone ? "重开" : "验收"}
        </Link>
      ) : (
        <button
          type="button"
          className="dashboard-workspace__check"
          aria-label={`${isDone ? "标记为未完成" : "标记为完成"}：${task.title}`}
          aria-pressed={isDone}
          aria-busy={isUpdating}
          disabled={isUpdating}
          onClick={handleToggle}
        >
          <span aria-hidden="true">{isDone ? <Check size={13} /> : null}</span>
        </button>
      )}
      <button
        type="button"
        data-task-preview-id={task.id}
        className="dashboard-workspace__task-preview"
        onClick={() => onPreviewTask(task)}
      >
        <strong title={task.title}>{task.title}</strong>
        <span className="dashboard-workspace__priority-label">{priorityLabels[task.priority]}优先级</span>
        <span className={`dashboard-workspace__status dashboard-workspace__status--${task.status}`}>
          {statusLabels[task.status]}
        </span>
        <span className={`dashboard-workspace__due${dueClass}`}>{dueLabel}</span>
      </button>
    </div>
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
