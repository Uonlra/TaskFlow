"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

import type { Task } from "@/features/tasks/types/task.types";
import { parseTaskDueDateValue } from "@/features/tasks/utils/task-date-filters";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";

type DesktopTaskTableEmptyState = {
  title: string;
  description: string;
};

type DesktopTaskTableProps = {
  tasks: Task[];
  emptyState: DesktopTaskTableEmptyState;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onPreviewTask?: (task: Task) => void;
  onUpdateStatus: (id: string, status: Task["status"]) => void | Promise<void>;
  scrollPositionRef: { current: number };
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

export function DesktopTaskTable({
  tasks,
  emptyState,
  selectedTaskId,
  onSelectTask,
  onPreviewTask = () => {},
  onUpdateStatus,
  scrollPositionRef,
}: DesktopTaskTableProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) {
      return;
    }

    const maxScrollTop = Math.max(0, body.scrollHeight - body.clientHeight);
    body.scrollTop = Math.min(scrollPositionRef.current, maxScrollTop);
  }, [scrollPositionRef, tasks]);

  const handleBodyScroll = useCallback(() => {
    if (bodyRef.current) {
      scrollPositionRef.current = bodyRef.current.scrollTop;
    }
  }, [scrollPositionRef]);

  if (!tasks.length) {
    return (
      <div className="desktop-task-empty">
        <strong>{emptyState.title}</strong>
        <span>{emptyState.description}</span>
      </div>
    );
  }

  return (
    <div className="desktop-task-table" role="table" aria-label="任务列表">
      <div className="desktop-task-table__viewport">
        <div className="desktop-task-table__head" role="row">
          <span role="columnheader" aria-label="完成状态" />
          <span role="columnheader">任务</span>
          <span role="columnheader">标签</span>
          <span role="columnheader">截止时间</span>
          <span role="columnheader">优先级</span>
          <span role="columnheader">状态</span>
          <span role="columnheader">操作</span>
        </div>

        <div
          ref={bodyRef}
          className="desktop-task-table__body"
          role="rowgroup"
          tabIndex={0}
          aria-label="可滚动任务列表"
          data-lenis-prevent-wheel="true"
          onScroll={handleBodyScroll}
        >
          {tasks.map((task) => (
            <DesktopTaskRow
              key={task.id}
              task={task}
              selected={task.id === selectedTaskId}
              onSelectTask={onSelectTask}
              onPreviewTask={onPreviewTask}
              onUpdateStatus={onUpdateStatus}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DesktopTaskRow({
  task,
  selected,
  onSelectTask,
  onPreviewTask,
  onUpdateStatus,
}: {
  task: Task;
  selected: boolean;
  onSelectTask: (taskId: string) => void;
  onPreviewTask: (task: Task) => void;
  onUpdateStatus: (id: string, status: Task["status"]) => void | Promise<void>;
}) {
  const dueMeta = getTaskDueMeta(task);
  const nextStatus = task.status === "done" ? "todo" : "done";

  return (
    <div
      className={["desktop-task-table__row", selected ? "is-selected" : "", task.status === "done" ? "is-done" : ""]
        .filter(Boolean)
        .join(" ")}
      data-task-row="true"
      role="row"
      tabIndex={0}
      aria-selected={selected}
      onClick={() => {
        onSelectTask(task.id);
        onPreviewTask(task);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelectTask(task.id);
          onPreviewTask(task);
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
              <span className="desktop-task-chip desktop-task-chip--muted">+{task.tags.length - 2}</span>
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
        <span className={`desktop-task-status desktop-task-status--${task.status}`}>{statusLabel[task.status]}</span>
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

  const date = parseTaskDueDateValue(task.dueDate);

  if (!date) {
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
