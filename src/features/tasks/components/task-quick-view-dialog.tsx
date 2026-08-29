"use client";

import Link from "next/link";
import { CheckCircle2, ExternalLink, RotateCcw, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";

import { ConfirmDialog } from "@/shared/components/common/confirm-dialog";
import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";
import { formatTagsInput } from "@/features/tasks/utils/task-tags";

type TaskQuickViewDialogProps = {
  task: Task | null;
  onClose: () => void;
  onToggleComplete: (task: Task) => void | Promise<void>;
  onDelete: (task: Task) => void | Promise<void>;
} & (
  | {
      onUpdateTask: (task: Task, values: TaskFormValues) => void | Promise<void>;
      onEdit?: never;
    }
  | {
      onEdit: (task: Task) => void;
      onUpdateTask?: never;
    }
);

const statusLabels: Record<Task["status"], string> = {
  todo: "待开始",
  in_progress: "进行中",
  done: "已完成",
};

const priorityLabels: Record<Task["priority"], string> = {
  low: "低优先级",
  medium: "中优先级",
  high: "高优先级",
};

export function TaskQuickViewDialog({
  task,
  onClose,
  onUpdateTask,
  onEdit,
  onToggleComplete,
  onDelete,
}: TaskQuickViewDialogProps) {
  const mounted = useSyncExternalStore(subscribeToClient, getClientSnapshot, getServerSnapshot);
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const taskId = task?.id;

  useEffect(() => {
    if (!taskId || !mounted) return;

    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [mounted, taskId]);

  useEffect(() => {
    if (!taskId || !mounted) return;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const hasNestedDialog = document.querySelectorAll(".dialog-overlay").length > 1;
      if (event.key === "Escape" && !isUpdatingStatus && !hasNestedDialog) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUpdatingStatus, mounted, onClose, taskId]);

  if (!task || !mounted) return null;

  const dueMeta = getTaskDueMeta(task);
  const taskValues: TaskFormValues = {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    tags: formatTagsInput(task.tags),
    dueDate: task.dueDate ?? "",
  };

  const handleToggleComplete = async () => {
    setIsUpdatingStatus(true);
    try {
      await onToggleComplete(task);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return createPortal(
    <div
      className="dialog-overlay task-quick-view-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isUpdatingStatus) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="task-quick-view-dialog card-surface"
        data-lenis-prevent-wheel="true"
        onKeyDown={trapDialogFocus}
      >
        <header className="task-quick-view-dialog__header">
          <div>
            <p className="section-eyebrow">任务速览</p>
            <h2 id={titleId}>{task.title}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="dialog-close-button"
            aria-label="关闭任务查看"
            title="关闭任务查看"
            onClick={onClose}
            disabled={isUpdatingStatus}
          >
            <X aria-hidden="true" size={18} strokeWidth={2} />
          </button>
        </header>

        <div className="task-quick-view-dialog__body">
          <div className="task-quick-view-dialog__badges" aria-label="任务状态和优先级">
            <strong className={`task-detail-status task-detail-status--${task.status}`}>
              {statusLabels[task.status]}
            </strong>
            <span className={`task-quick-view-dialog__priority is-${task.priority}`}>
              <span aria-hidden="true" />
              {priorityLabels[task.priority]}
            </span>
          </div>

          <section className="task-quick-view-dialog__description">
            <h3>描述</h3>
            <p id={descriptionId}>{task.description || "暂无描述"}</p>
          </section>

          <dl className="task-quick-view-dialog__meta">
            <div>
              <dt>截止日期</dt>
              <dd className={`is-${dueMeta.tone}`}>{dueMeta.label}</dd>
            </div>
            <div>
              <dt>创建时间</dt>
              <dd>{formatTaskTimestamp(task.createdAt)}</dd>
            </div>
          </dl>

          <section className="task-quick-view-dialog__tags" aria-label="任务标签">
            <h3>标签</h3>
            {task.tags.length ? (
              <div>
                {task.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
            ) : (
              <p>暂无标签</p>
            )}
          </section>
        </div>

        <footer className="task-quick-view-dialog__actions">
          {onUpdateTask ? (
            <TaskFormDialog
              key={task.id}
              onSubmitTask={(values) => onUpdateTask(task, values)}
              initialValues={taskValues}
              triggerLabel="编辑任务"
              dialogEyebrow="编辑任务"
              dialogTitle="调整这条任务"
              submitLabel="保存修改"
              triggerClassName="tesla-action tesla-action--secondary"
            />
          ) : (
            <button type="button" className="tesla-action tesla-action--secondary" onClick={() => onEdit?.(task)}>
              编辑任务
            </button>
          )}
          <button
            type="button"
            className="tesla-action tesla-action--primary"
            disabled={isUpdatingStatus}
            onClick={() => void handleToggleComplete()}
          >
            {task.status === "done" ? (
              <RotateCcw size={16} aria-hidden="true" />
            ) : (
              <CheckCircle2 size={16} aria-hidden="true" />
            )}
            {isUpdatingStatus ? "更新中..." : task.status === "done" ? "标记为未完成" : "标记为完成"}
          </button>
          <ConfirmDialog
            triggerLabel="删除任务"
            title="确认删除这条任务？"
            description="删除后会从任务列表和当前日期中移除，且无法恢复。"
            confirmLabel="确认删除"
            confirmTone="danger"
            onConfirm={() => onDelete(task)}
            triggerClassName="tesla-action tesla-action--danger"
          />
          <Link className="task-quick-view-dialog__full-link" href={`/tasks/${task.id}`}>
            <ExternalLink size={15} aria-hidden="true" />
            完整详情
          </Link>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function subscribeToClient() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

function trapDialogFocus(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab") return;

  const focusable = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
  const first = focusable[0];
  const last = focusable.at(-1);

  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function formatTaskTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
