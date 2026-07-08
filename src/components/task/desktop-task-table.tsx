"use client";

import type { Task } from "@/features/tasks/types/task.types";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";

type DesktopTaskTableProps = {
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onUpdateStatus: (id: string, status: Task["status"]) => void | Promise<void>;
};

const priorityLabel: Record<Task["priority"], string> = {
  high: "高",
  medium: "中",
  low: "低",
};

const statusLabel: Record<Task["status"], string> = {
  todo: "待开始",
  in_progress: "进行中",
  done: "已完成",
};

export function DesktopTaskTable({ tasks, selectedTaskId, onSelectTask, onUpdateStatus }: DesktopTaskTableProps) {
  if (!tasks.length) {
    return (
      <div className="desktop-task-empty">
        <strong>没有任务</strong>
        <span>换个筛选，或者新建一条任务。</span>
      </div>
    );
  }

  return (
    <div className="desktop-task-table" role="table" aria-label="任务列表">
      <div className="desktop-task-table__head" role="row">
        <span role="columnheader" aria-label="完成状态" />
        <span role="columnheader">任务</span>
        <span role="columnheader">标签</span>
        <span role="columnheader">截止时间</span>
        <span role="columnheader">优先级</span>
        <span role="columnheader">状态</span>
        <span role="columnheader">操作</span>
      </div>

      <div className="desktop-task-table__body">
        {tasks.map((task) => (
          <DesktopTaskRow
            key={task.id}
            task={task}
            selected={task.id === selectedTaskId}
            onSelectTask={onSelectTask}
            onUpdateStatus={onUpdateStatus}
          />
        ))}
      </div>
    </div>
  );
}

function DesktopTaskRow({
  task,
  selected,
  onSelectTask,
  onUpdateStatus,
}: {
  task: Task;
  selected: boolean;
  onSelectTask: (taskId: string) => void;
  onUpdateStatus: (id: string, status: Task["status"]) => void | Promise<void>;
}) {
  const dueMeta = getTaskDueMeta(task);
  const nextStatus = task.status === "done" ? "todo" : "done";

  return (
    <div
      className={[
        "desktop-task-table__row",
        selected ? "is-selected" : "",
        task.status === "done" ? "is-done" : "",
      ].filter(Boolean).join(" ")}
      role="row"
      tabIndex={0}
      onClick={() => onSelectTask(task.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelectTask(task.id);
        }
      }}
    >
      <span role="cell" className="desktop-task-table__check-cell">
        <button
          type="button"
          className="desktop-task-check"
          aria-label={task.status === "done" ? "标记为未完成" : "标记为完成"}
          aria-pressed={task.status === "done"}
          onClick={(event) => {
            event.stopPropagation();
            void onUpdateStatus(task.id, nextStatus);
          }}
        />
      </span>

      <span role="cell" className="desktop-task-table__task-cell">
        <strong>{task.title}</strong>
        <small>{task.description || "无描述"}</small>
      </span>

      <span role="cell" className="desktop-task-table__tags">
        {task.tags.length ? (
          <>
            {task.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="desktop-task-chip">
                {tag}
              </span>
            ))}
            {task.tags.length > 2 ? (
              <span className="desktop-task-chip desktop-task-chip--muted">
                +{task.tags.length - 2}
              </span>
            ) : null}
          </>
        ) : (
          <span className="desktop-task-muted">无标签</span>
        )}
      </span>

      <span role="cell" className={`desktop-task-due desktop-task-due--${dueMeta.tone}`}>
        {formatDueLabel(task, dueMeta.label)}
      </span>

      <span role="cell" className="desktop-task-priority">
        <span className={`desktop-task-priority__dot desktop-task-priority__dot--${task.priority}`} />
        {priorityLabel[task.priority]}
      </span>

      <span role="cell">
        <span className={`desktop-task-status desktop-task-status--${task.status}`}>
          {statusLabel[task.status]}
        </span>
      </span>

      <span role="cell" className="desktop-task-table__actions">
        <button
          type="button"
          aria-label="更多操作"
          onClick={(event) => {
            event.stopPropagation();
            onSelectTask(task.id);
          }}
        >
          ...
        </button>
      </span>
    </div>
  );
}

function formatDueLabel(task: Task, fallback: string) {
  if (!task.dueDate || task.status === "done") {
    return fallback;
  }

  const date = new Date(task.dueDate);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  const today = startOfDay(new Date());
  const dueDate = startOfDay(date);
  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / 86400000);

  if (diffDays === 0) {
    return "今天";
  }

  if (diffDays === 1) {
    return "明天";
  }

  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}
