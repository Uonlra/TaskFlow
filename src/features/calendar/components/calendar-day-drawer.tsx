"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, Circle, Clock3, X } from "lucide-react";

import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import type { CalendarDaySummary } from "@/features/calendar/utils/calendar-task-summary";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";

type CalendarDayDrawerProps = {
  open: boolean;
  dateParam: string;
  tasks: Task[];
  summary: CalendarDaySummary;
  isLoading: boolean;
  onClose: () => void;
  onCreateTask: (values: TaskFormValues) => void | Promise<void>;
  onPreviewTask: (task: Task) => void;
};

const statusLabels = {
  todo: "待开始",
  in_progress: "进行中",
  done: "已完成",
} as const;

const priorityLabels = {
  low: "低优先级",
  medium: "中优先级",
  high: "高优先级",
} as const;

export function CalendarDayDrawer({
  open,
  dateParam,
  tasks,
  summary,
  isLoading,
  onClose,
  onCreateTask,
  onPreviewTask,
}: CalendarDayDrawerProps) {
  const mounted = useSyncExternalStore(subscribeToClient, getClientSnapshot, getServerSnapshot);
  const titleId = useId();
  const drawerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open || !mounted) return;

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector(".dialog-overlay")) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      root.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
      document.querySelector<HTMLElement>(`[data-calendar-date="${dateParam}"]`)?.focus();
    };
  }, [dateParam, mounted, onClose, open]);

  if (!mounted || !open) return null;

  const ringStyle = buildRingStyle(summary);

  return createPortal(
    <div
      className="calendar-drawer-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        ref={drawerRef}
        className="calendar-day-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-lenis-prevent-wheel="true"
        onKeyDown={trapDrawerFocus}
      >
        <header className="calendar-day-drawer__header">
          <div>
            <span className="calendar-eyebrow">日期详情</span>
            <h2 id={titleId}>{formatDrawerDate(dateParam)}</h2>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="关闭日期详情">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="calendar-day-drawer__content">
          <section className="calendar-day-progress" aria-label="当日任务完成情况">
            <div className="calendar-progress-ring" style={ringStyle} aria-hidden="true">
              <span>
                <strong>{summary.done}</strong>
                <small>/ {summary.total}</small>
              </span>
            </div>
            <div className="calendar-day-progress__copy">
              <span>任务完成情况</span>
              <strong>{summary.total ? `${Math.round((summary.done / summary.total) * 100)}%` : "暂无任务"}</strong>
              <small>
                {summary.total ? `已完成 ${summary.done} / 共 ${summary.total} 项` : "为这一天安排第一项任务"}
              </small>
            </div>
          </section>

          <div className="calendar-day-statuses" aria-label="任务状态数量">
            <StatusCount icon={<Check size={15} />} label="已完成" value={summary.done} tone="done" />
            <StatusCount icon={<Clock3 size={15} />} label="进行中" value={summary.inProgress} tone="progress" />
            <StatusCount icon={<Circle size={15} />} label="待开始" value={summary.todo} tone="todo" />
          </div>

          <section className="calendar-day-task-section" aria-labelledby={`${titleId}-tasks`}>
            <div className="calendar-day-task-section__head">
              <h3 id={`${titleId}-tasks`}>当天任务</h3>
              <span>{summary.total} 项</span>
            </div>
            <div className="calendar-day-task-list" aria-busy={isLoading}>
              {isLoading && !tasks.length ? (
                <p className="calendar-day-task-list__empty">正在同步任务...</p>
              ) : tasks.length ? (
                tasks.map((task) => <CalendarDrawerTask key={task.id} task={task} onPreviewTask={onPreviewTask} />)
              ) : (
                <p className="calendar-day-task-list__empty">这一天还没有任务。</p>
              )}
            </div>
          </section>
        </div>

        <footer className="calendar-day-drawer__footer">
          <TaskFormDialog
            key={dateParam}
            onSubmitTask={onCreateTask}
            createDefaults={{ dueDate: dateParam }}
            triggerLabel="创建任务"
            dialogEyebrow={formatDrawerDate(dateParam)}
            dialogTitle="为这一天创建任务"
            triggerClassName="tesla-action tesla-action--primary calendar-day-drawer__create"
          />
          <Link href={`/tasks?date=${dateParam}`}>查看任务页</Link>
        </footer>
      </aside>
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

function StatusCount({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: "done" | "progress" | "todo";
}) {
  return (
    <div className={`calendar-day-status calendar-day-status--${tone}`}>
      <span aria-hidden="true">{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function CalendarDrawerTask({ task, onPreviewTask }: { task: Task; onPreviewTask: (task: Task) => void }) {
  const dueMeta = getTaskDueMeta(task);

  return (
    <button
      type="button"
      className={`calendar-drawer-task calendar-drawer-task--${task.status}${dueMeta.isOverdue ? " is-overdue" : ""}`}
      data-calendar-task-id={task.id}
      onClick={() => onPreviewTask(task)}
    >
      <span className="calendar-drawer-task__status" aria-hidden="true" />
      <span className="calendar-drawer-task__copy">
        <strong>{task.title}</strong>
        <small>
          {statusLabels[task.status]} · {priorityLabels[task.priority]} · {dueMeta.label}
        </small>
      </span>
    </button>
  );
}

function buildRingStyle(summary: CalendarDaySummary) {
  if (!summary.total) return undefined;

  const doneEnd = (summary.done / summary.total) * 360;
  const progressEnd = doneEnd + (summary.inProgress / summary.total) * 360;

  return {
    "--calendar-ring-done": `${doneEnd}deg`,
    "--calendar-ring-progress": `${progressEnd}deg`,
  } as CSSProperties;
}

function formatDrawerDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(year, month - 1, day));
}

function trapDrawerFocus(event: KeyboardEvent<HTMLElement>) {
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
