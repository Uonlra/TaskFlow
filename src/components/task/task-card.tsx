"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { TaskFormDialog } from "@/components/task/task-form-dialog";
import { TaskPriorityBadge } from "@/components/task/task-priority-badge";
import { StatusDot, type TaskSignalTone } from "@/components/task/task-status-lights";
import { TaskStatusBadge } from "@/components/task/task-status-badge";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";
import { formatTagsInput } from "@/features/tasks/utils/task-tags";

type TaskCardProps = {
  task: Task;
  compact?: boolean;
  onUpdateTask?: (id: string, values: TaskFormValues) => void | Promise<void>;
  onDeleteTask?: (id: string) => void | Promise<void>;
  onUpdateStatus?: (id: string, status: Task["status"]) => void | Promise<void>;
};

const statusOptions: Array<{ value: Task["status"]; label: string }> = [
  { value: "todo", label: "待开始" },
  { value: "in_progress", label: "进行中" },
  { value: "done", label: "已完成" },
];

export function TaskCard({ task, compact = false, onUpdateTask, onDeleteTask, onUpdateStatus }: TaskCardProps) {
  const dueMeta = getTaskDueMeta(task);
  const taskTags = task.tags ?? [];
  const cardToneClassName = getTaskCardToneClassName(task, dueMeta.isOverdue);
  const signalTone = getTaskSignalTone(task, dueMeta.isOverdue, dueMeta.isDueToday);
  const signalActive = task.status !== "todo" || dueMeta.isOverdue || dueMeta.isDueToday;
  const flashClassName = useTaskStatusFlash(task.status);

  if (compact) {
    return (
      <Link
        href={`/tasks/${task.id}`}
        className={`task-card task-card--compact${cardToneClassName}${flashClassName}`}
      >
        <div className="task-card__header">
          <div>
            <div className="task-card__title-row">
              <StatusDot tone={signalTone} active={signalActive} />
              <h3 className="task-card__title">{task.title}</h3>
            </div>
            <p className="task-card__description">{task.description}</p>
          </div>
          <TaskStatusBadge status={task.status} />
        </div>

        <div className="task-card__meta">
          <TaskPriorityBadge priority={task.priority} />
          <MetaPill label={dueMeta.label} tone={dueMeta.tone} />
          {task.dueDate ? <MetaPill label={`日期：${task.dueDate}`} /> : null}
          {taskTags.map((tag) => (
            <MetaPill key={tag} label={`#${tag}`} tone="success" />
          ))}
        </div>
      </Link>
    );
  }

  const taskValues: TaskFormValues = {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    tags: formatTagsInput(task.tags),
    dueDate: task.dueDate ?? "",
  };

  return (
    <article
      className={`task-card${cardToneClassName}${flashClassName}`}
    >
      <div className="task-card__header">
        <div>
          <div className="task-card__title-row">
            <StatusDot tone={signalTone} active={signalActive} />
            <h3 className="task-card__title">{task.title}</h3>
          </div>
          <p className="task-card__description">
            {task.description}
          </p>
        </div>
        <TaskStatusBadge status={task.status} />
      </div>

      <div className="task-card__timestamps">
        <span>创建于 {formatDateLabel(task.createdAt)}</span>
        {task.updatedAt ? <span>最近更新 {formatDateLabel(task.updatedAt)}</span> : null}
      </div>

      <div className="task-card__meta">
        <TaskPriorityBadge priority={task.priority} />
        <MetaPill label={dueMeta.label} tone={dueMeta.tone} />
        {task.dueDate ? <MetaPill label={`日期：${task.dueDate}`} /> : null}
        {taskTags.map((tag) => (
          <MetaPill key={tag} label={`#${tag}`} tone="success" />
        ))}
      </div>

      <div className="task-card__actions">
        <Link
          href={`/tasks/${task.id}`}
          className="tesla-action tesla-action--primary"
        >
          查看详情
        </Link>
        {onUpdateStatus ? (
          <StatusSegmentedControl
            currentStatus={task.status}
            onChange={(status) => onUpdateStatus(task.id, status)}
          />
        ) : null}
        {onUpdateTask ? (
          <TaskFormDialog
            onSubmitTask={(values) => onUpdateTask(task.id, values)}
            initialValues={taskValues}
            triggerLabel="编辑"
            dialogEyebrow="编辑任务"
            dialogTitle="调整这条任务"
            submitLabel="保存修改"
          />
        ) : null}
        <ConfirmDialog
          triggerLabel="删除"
          title="确认删除这条任务？"
          description="删除后会从当前任务本与浏览器本地存储中移除，无法恢复。"
          confirmLabel="确认删除"
          confirmTone="danger"
          onConfirm={() => onDeleteTask?.(task.id)}
          triggerClassName="tesla-action tesla-action--danger"
        />
      </div>
    </article>
  );
}

function useTaskStatusFlash(status: Task["status"]) {
  const previousStatusRef = useRef(status);
  const [flashStatus, setFlashStatus] = useState<Task["status"] | null>(null);

  useEffect(() => {
    if (previousStatusRef.current === status) {
      return undefined;
    }

    previousStatusRef.current = status;
    setFlashStatus(status);

    const timeoutId = window.setTimeout(() => {
      setFlashStatus(null);
    }, 760);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [status]);

  if (!flashStatus) {
    return "";
  }

  return ` task-card--status-flash task-card--status-flash-${flashStatus}`;
}

function StatusSegmentedControl({
  currentStatus,
  onChange,
}: {
  currentStatus: Task["status"];
  onChange: (status: Task["status"]) => void | Promise<void>;
}) {
  return (
    <div className="task-status-segment" aria-label="切换任务状态">
      {statusOptions.map((option) => {
        const isActive = option.value === currentStatus;

        return (
          <button
            key={option.value}
            type="button"
            disabled={isActive}
            aria-pressed={isActive}
            className={isActive ? "task-status-segment__button task-status-segment__button--active" : "task-status-segment__button"}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function getTaskCardToneClassName(task: Task, isOverdue: boolean) {
  if (task.status === "done") {
    return " task-card--done";
  }

  if (isOverdue) {
    return " task-card--attention";
  }

  return "";
}

function getTaskSignalTone(task: Task, isOverdue: boolean, isDueToday: boolean): TaskSignalTone {
  if (task.status === "done") {
    return "success";
  }

  if (isOverdue) {
    return "danger";
  }

  if (isDueToday) {
    return "warning";
  }

  if (task.status === "in_progress") {
    return "info";
  }

  return "neutral";
}

function MetaPill({ label, tone = "muted" }: { label: string; tone?: "danger" | "warning" | "success" | "muted" }) {
  const toneClassName =
    tone === "danger"
      ? "task-meta-pill task-meta-pill--danger"
      : tone === "warning"
        ? "task-meta-pill task-meta-pill--warning"
        : tone === "success"
          ? "task-meta-pill task-meta-pill--success"
          : "task-meta-pill";

  return (
    <span className={toneClassName}>
      {label}
    </span>
  );
}

function formatDateLabel(value: string) {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }

  return timestamp.toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
}
