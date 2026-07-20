import Link from "next/link";

import type { DashboardAnalyticsRange, DashboardTaskPreview } from "@/features/tasks/utils/task-analytics";
import { buildTasksHref } from "@/shared/lib/constants/query-params";

type DashboardFocusPanelProps = {
  tasks: DashboardTaskPreview[];
  deadlines: DashboardTaskPreview[];
  range: DashboardAnalyticsRange;
};

export function DashboardFocusPanel({ tasks, deadlines, range }: DashboardFocusPanelProps) {
  const copy = getFocusCopy(range);
  const taskIds = new Set(tasks.map((task) => task.id));
  const visibleDeadlines = deadlines.filter((task) => !taskIds.has(task.id));

  return (
    <>
      <section className="dashboard-v2-panel">
        <div className="dashboard-v2-panel__head">
          <h2>{copy.focusTitle}</h2>
          <Link href={buildTasksHref({ priority: "high" })}>查看全部</Link>
        </div>
        <TaskPreviewList tasks={tasks} emptyLabel={copy.focusEmpty} />
      </section>

      <section className="dashboard-v2-panel">
        <div className="dashboard-v2-panel__head">
          <h2>{copy.deadlineTitle}</h2>
          <Link href={buildTasksHref({ due: range === "today" ? "today" : "upcoming" })}>查看全部</Link>
        </div>
        <TaskPreviewList tasks={visibleDeadlines} emptyLabel={copy.deadlineEmpty} />
      </section>
    </>
  );
}

function TaskPreviewList({ tasks, emptyLabel }: { tasks: DashboardTaskPreview[]; emptyLabel: string }) {
  if (!tasks.length) {
    return (
      <div className="dashboard-v2-empty-list">
        <span />
        <strong>{emptyLabel}</strong>
        <p>添加任务后显示</p>
      </div>
    );
  }

  return (
    <div className="dashboard-v2-task-list">
      {tasks.map((task) => (
        <article key={task.id} className={`dashboard-v2-task dashboard-v2-task--${task.priority}`}>
          <span className="dashboard-v2-task__flag" aria-hidden="true" />
          <div>
            <strong>{task.title}</strong>
            <small>{task.dueLabel}</small>
            <span className="dashboard-v2-task__meta">
              <b>{priorityLabels[task.priority]}</b>
              <b>{statusLabels[task.status]}</b>
            </span>
          </div>
        </article>
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

