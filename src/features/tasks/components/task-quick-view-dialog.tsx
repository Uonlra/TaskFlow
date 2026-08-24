"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState } from "react";

import type { Task } from "@/features/tasks/types/task.types";

type TaskQuickViewDialogProps = {
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task) => void | Promise<void>;
  onDelete: (task: Task) => void | Promise<void>;
};

const statusLabels: Record<Task["status"], string> = {
  todo: "待开始",
  in_progress: "进行中",
  done: "已完成",
};

export function TaskQuickViewDialog({ task, onClose, onEdit, onToggleComplete, onDelete }: TaskQuickViewDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);

    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!task || !mounted) {
      document.body.style.removeProperty("overflow");
      return;
    }

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.removeProperty("overflow");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSubmitting, mounted, onClose, task]);

  if (!task || !mounted) {
    return null;
  }

  const handleAction = async (action: () => void | Promise<void>) => {
    setIsSubmitting(true);

    try {
      await action();
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="dialog-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="task-quick-view-dialog card-surface"
      >
        <header className="task-quick-view-dialog__header">
          <div>
            <p className="section-eyebrow">任务查看</p>
            <h2 id={titleId}>{task.title}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="dialog-close-button"
            aria-label="关闭任务查看"
            title="关闭任务查看"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X aria-hidden="true" size={18} strokeWidth={2} />
          </button>
        </header>

        <div className="task-quick-view-dialog__body">
          <section aria-labelledby={descriptionId}>
            <h3 id={descriptionId}>描述</h3>
            <p>{task.description || "暂无描述"}</p>
          </section>

          <div className="task-quick-view-dialog__status" aria-label="任务状态">
            <span>状态</span>
            <strong className={`task-detail-status task-detail-status--${task.status}`}>
              {statusLabels[task.status]}
            </strong>
          </div>
        </div>

        <footer className="task-quick-view-dialog__actions">
          <button
            type="button"
            className="tesla-action tesla-action--secondary"
            disabled={isSubmitting}
            onClick={() => onEdit(task)}
          >
            编辑任务
          </button>
          <button
            type="button"
            className="tesla-action tesla-action--primary"
            disabled={isSubmitting}
            onClick={() => void handleAction(() => onToggleComplete(task))}
          >
            {task.status === "done" ? "标记为未完成" : "标记为完成"}
          </button>
          <button
            type="button"
            className="tesla-action tesla-action--danger"
            disabled={isSubmitting}
            onClick={() => void handleAction(() => onDelete(task))}
          >
            删除任务
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
