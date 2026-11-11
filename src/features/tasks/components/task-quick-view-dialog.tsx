"use client";

import "@/styles/task-detail.css";

import Link from "next/link";
import { CheckCircle2, ExternalLink, Plus, RotateCcw, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { useKeyedQuery } from "@/shared/hooks/use-keyed-query";
import type { TaskEvolutionCommand } from "@/features/tasks/schemas/task-evolution-schema";
import { latestTask } from "@/features/tasks/utils/task-evolution-navigation";
import { TaskEvolutionPreview } from "./task-evolution-preview";
import { TaskEvolutionActionForm } from "./task-evolution-action-form";

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
  onExecuteEvolution?: (task: Task, command: TaskEvolutionCommand) => Promise<Task>;
  onLoadTask?: (id: string) => Promise<Task | null>;
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

export function TaskQuickViewDialog(props: TaskQuickViewDialogProps) {
  return <TaskQuickViewContent key={props.task?.id ?? "closed"} {...props} />;
}

function TaskQuickViewContent({
  task: previewTask,
  onClose,
  onUpdateTask,
  onEdit,
  onToggleComplete,
  onDelete,
  onExecuteEvolution,
  onLoadTask,
}: TaskQuickViewDialogProps) {
  const mounted = useSyncExternalStore(subscribeToClient, getClientSnapshot, getServerSnapshot);
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const progressButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [recording, setRecording] = useState(false);
  const [savedTask, setSavedTask] = useState<Task | null>(null);
  const taskId = previewTask?.id;
  const load = useCallback(async () => {
    const loaded = taskId && (await onLoadTask?.(taskId));
    if (!loaded) throw new Error("任务不存在或已删除。");
    return loaded;
  }, [onLoadTask, taskId]);
  const query = useKeyedQuery({
    key: onLoadTask && taskId ? taskId : null,
    enabled: Boolean(onLoadTask && taskId),
    load,
    formatError: previewError,
  });
  const task = latestTask(savedTask, latestTask(query.data, previewTask));
  const isReading = Boolean(onLoadTask && (query.isLoading || query.error));
  const closeProgress = useCallback(() => {
    setRecording(false);
    requestAnimationFrame(() => progressButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!taskId || !mounted) return;

    const body = document.body;
    const previousOverflow = body.style.overflow;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      body.style.overflow = previousOverflow;
      const replacement = Array.from(document.querySelectorAll<HTMLElement>("[data-task-preview-id]")).find(
        (node) => node.dataset.taskPreviewId === taskId && node.checkVisibility?.(),
      );
      (opener?.isConnected ? opener : replacement)?.focus({ preventScroll: true });
    };
  }, [mounted, taskId]);

  useEffect(() => {
    if (!taskId || !mounted) return;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const hasNestedDialog = document.querySelectorAll(".dialog-overlay").length > 1;
      if (event.key === "Escape" && !event.defaultPrevented && !isUpdatingStatus && !hasNestedDialog) {
        if (recording) closeProgress();
        else onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUpdatingStatus, mounted, onClose, taskId, recording, closeProgress]);

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
      className="dialog-overlay"
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
          <div className="task-quick-view-dialog__badges" role="group" aria-label="任务状态和优先级">
            <strong className={`task-detail-status task-detail-status--${task.status}`}>
              {statusLabels[task.status]}
            </strong>
            <span className={`task-quick-view-dialog__priority is-${task.priority}`}>
              <span aria-hidden="true" />
              {priorityLabels[task.priority]}
            </span>
          </div>

          <section className="task-quick-view-dialog__description">
            <h3>当前目标</h3>
            <p id={descriptionId}>{task.evolution?.goal.successCriteria || task.description || "未设置完成标准"}</p>
            {task.evolution?.goal.successCriteria && task.description ? <p>{task.description}</p> : null}
          </section>

          {query.error ? (
            <div role="alert" className="task-evolution-error">
              {query.error}
              <button type="button" onClick={() => void query.reload()}>
                重新加载
              </button>
            </div>
          ) : isReading ? (
            <p role="status">正在读取任务…</p>
          ) : null}
          {!isReading && onExecuteEvolution && task.status !== "done" && !recording ? (
            <button
              ref={progressButtonRef}
              className="task-quick-view-dialog__progress"
              type="button"
              onClick={() => setRecording(true)}
            >
              <Plus size={14} aria-hidden="true" />
              记录进展
            </button>
          ) : null}
          {savedTask && !recording ? (
            <p role="status" className="task-evolution-muted">
              进展已保存
            </p>
          ) : null}
          {recording && onExecuteEvolution ? (
            <TaskEvolutionActionForm
              task={task}
              intent={{ type: "record_progress" }}
              onExecute={async (command) => {
                setIsUpdatingStatus(true);
                try {
                  const saved = await onExecuteEvolution(task, command);
                  setSavedTask(saved);
                  return saved;
                } finally {
                  setIsUpdatingStatus(false);
                }
              }}
              onCancel={closeProgress}
              onSuccess={closeProgress}
            />
          ) : null}
          {!isReading && task.evolution ? <TaskEvolutionPreview evolution={task.evolution} /> : null}

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

          {task.tags.length ? (
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
          ) : null}
        </div>

        <footer className="task-quick-view-dialog__actions">
          {!isReading &&
            !recording &&
            !isUpdatingStatus &&
            (onUpdateTask ? (
              <TaskFormDialog
                lockGoalAndStatus={Boolean(task.evolution)}
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
            ))}
          {!isReading &&
            !recording &&
            (task.evolution ? (
              <Link className="tesla-action tesla-action--primary" href={`/tasks/${encodeURIComponent(task.id)}`}>
                {task.status === "done" ? "前往详情重新打开" : "前往详情验收"}
              </Link>
            ) : (
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
            ))}
          {!isReading && !recording && !isUpdatingStatus && (
            <ConfirmDialog
              triggerLabel="删除任务"
              title="确认删除这条任务？"
              description="删除后会从任务列表和当前日期中移除，且无法恢复。"
              confirmLabel="确认删除"
              confirmTone="danger"
              onConfirm={() => onDelete(task)}
              triggerClassName="tesla-action tesla-action--danger"
            />
          )}
          {!isUpdatingStatus && (
            <Link className="task-quick-view-dialog__full-link" href={`/tasks/${encodeURIComponent(task.id)}`}>
              <ExternalLink size={15} aria-hidden="true" />
              完整详情
            </Link>
          )}
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
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

function previewError(error: unknown) {
  return error instanceof Error ? error.message : "任务暂时无法读取。";
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
