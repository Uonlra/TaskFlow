import Link from "next/link";

import type { DashboardAnalyticsRange, DashboardTaskPreview } from "@/features/tasks/utils/task-analytics";
import { DataEmptyState } from "@/shared/components/common/data-empty-state";
import { buildTasksHref } from "@/shared/lib/constants/query-params";

type DashboardFocusPanelProps = {
  tasks: DashboardTaskPreview[];
  deadlines: DashboardTaskPreview[];
  range: DashboardAnalyticsRange;
  showFocus?: boolean;
  onPreviewTask: (task: DashboardTaskPreview) => void;
};

export function DashboardFocusPanel({
  tasks,
  deadlines,
  range,
  showFocus = true,
  onPreviewTask,
}: DashboardFocusPanelProps) {
  const copy = getFocusCopy(range);
  const taskIds = new Set(tasks.map((task) => task.id));
  const visibleDeadlines = deadlines.filter((task) => !taskIds.has(task.id));

  return (
    <>
      {showFocus ? (
        <section className="dashboard-v2-panel">
          <div className="dashboard-v2-panel__head">
            <h2>{copy.focusTitle}</h2>
            <Link href={buildTasksHref({ priority: "high" })}>查看全部</Link>
          </div>
          <TaskPreviewList tasks={tasks} emptyLabel={copy.focusEmpty} onPreviewTask={onPreviewTask} />
        </section>
      ) : null}

      <section className="dashboard-v2-panel">
        <div className="dashboard-v2-panel__head">
          <h2>{copy.deadlineTitle}</h2>
          <Link href={buildTasksHref({ due: range === "today" ? "today" : "upcoming" })}>查看全部</Link>
        </div>
        <TaskPreviewList tasks={visibleDeadlines} emptyLabel={copy.deadlineEmpty} onPreviewTask={onPreviewTask} />
      </section>
    </>
  );
}

function TaskPreviewList({
  tasks,
  emptyLabel,
  onPreviewTask,
}: {
  tasks: DashboardTaskPreview[];
  emptyLabel: string;
  onPreviewTask: (task: DashboardTaskPreview) => void;
}) {
  if (!tasks.length) {
    return <DataEmptyState variant="panel" title={emptyLabel} description="当前范围内没有符合条件的任务。" />;
  }

  return (
    <div className="dashboard-v2-task-list">
      {tasks.map((task) => (
        <button
          key={task.id}
          type="button"
          className={`dashboard-v2-task dashboard-v2-task--${task.priority}`}
          onClick={() => onPreviewTask(task)}
        >
          <span className="dashboard-v2-task__flag" aria-hidden="true" />
          <div>
            <strong>{task.title}</strong>
            <small>{task.dueLabel}</small>
            <span className="dashboard-v2-task__meta">
              <b>{priorityLabels[task.priority]}</b>
              <b>{statusLabels[task.status]}</b>
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

function getFocusCopy(range: DashboardAnalyticsRange) {
  if (range === "today") {
    return {
      focusTitle: "今日重点",
      deadlineTitle: "今日截止",
      focusEmpty: "暂无今日重点",
      deadlineEmpty: "暂无今日截止",
    };
  }

  if (range === "week") {
    return {
      focusTitle: "本周重点",
      deadlineTitle: "本周截止",
      focusEmpty: "暂无本周重点",
      deadlineEmpty: "暂无本周截止",
    };
  }

  return {
    focusTitle: "重点任务",
    deadlineTitle: "近期截止",
    focusEmpty: "暂无重点任务",
    deadlineEmpty: "暂无近期截止",
  };
}
const priorityLabels: Record<DashboardTaskPreview["priority"], string> = {
  high: "高",
  medium: "中",
  low: "低",
};

const statusLabels: Record<DashboardTaskPreview["status"], string> = {
  todo: "待开始",
  in_progress: "进行中",
  done: "已完成",
};
