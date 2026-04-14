import type { CSSProperties } from "react";
import Link from "next/link";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { TaskFormDialog } from "@/components/task/task-form-dialog";
import { TaskPriorityBadge } from "@/components/task/task-priority-badge";
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

const statusFlow: Task["status"][] = ["todo", "in_progress", "done"];

export function TaskCard({ task, compact = false, onUpdateTask, onDeleteTask, onUpdateStatus }: TaskCardProps) {
  const dueMeta = getTaskDueMeta(task);
  const taskTags = task.tags ?? [];

  if (compact) {
    return (
      <Link
        href={`/tasks/${task.id}`}
        style={{
          display: "block",
          padding: 18,
          borderRadius: 24,
          background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(247,250,255,0.8))",
          border: `1px solid ${dueMeta.isOverdue ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
          boxShadow: dueMeta.isOverdue ? "0 12px 28px rgba(239,68,68,0.08)" : "0 12px 28px rgba(37,99,235,0.06)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>{task.title}</h3>
            <p style={{ margin: "10px 0 0", color: "var(--muted-strong)", lineHeight: 1.7 }}>{task.description}</p>
          </div>
          <TaskStatusBadge status={task.status} />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
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

  const nextStatus = statusFlow[(statusFlow.indexOf(task.status) + 1) % statusFlow.length];
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
      style={{
        padding: 20,
        borderRadius: 24,
        background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(247,250,255,0.8))",
        border: `1px solid ${dueMeta.isOverdue ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
        boxShadow: dueMeta.isOverdue ? "0 14px 30px rgba(239,68,68,0.08)" : "0 14px 30px rgba(37,99,235,0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{task.title}</h3>
          <p style={{ margin: "10px 0 0", color: "var(--muted-strong)", lineHeight: 1.7 }}>
            {task.description}
          </p>
        </div>
        <TaskStatusBadge status={task.status} />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
        <TaskPriorityBadge priority={task.priority} />
        <MetaPill label={dueMeta.label} tone={dueMeta.tone} />
        {task.dueDate ? <MetaPill label={`日期：${task.dueDate}`} /> : null}
        {taskTags.map((tag) => (
          <MetaPill key={tag} label={`#${tag}`} tone="success" />
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
        <Link
          href={`/tasks/${task.id}`}
          className="ui-sans"
          style={{
            padding: "10px 14px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.84)",
            border: "1px solid var(--border)",
            fontWeight: 700,
          }}
        >
          查看
        </Link>
        <button
          type="button"
          onClick={() => onUpdateStatus?.(task.id, nextStatus)}
          style={actionButtonStyle}
        >
          切换为{nextStatus === "todo" ? "待开始" : nextStatus === "in_progress" ? "进行中" : "已完成"}
        </button>
        {onUpdateTask ? (
          <TaskFormDialog
            onSubmitTask={(values) => onUpdateTask(task.id, values)}
            initialValues={taskValues}
            triggerLabel="编辑"
            dialogEyebrow="编辑任务"
            dialogTitle="修改任务内容"
            submitLabel="保存修改"
          />
        ) : null}
        <ConfirmDialog
          triggerLabel="删除"
          title="确认删除这条任务？"
          description="删除后会从当前工作台与浏览器本地存储中移除，无法恢复。"
          confirmLabel="确认删除"
          confirmTone="danger"
          onConfirm={() => onDeleteTask?.(task.id)}
          triggerStyle={{
            ...actionButtonStyle,
            color: "var(--danger)",
          }}
        />
      </div>
    </article>
  );
}

function MetaPill({ label, tone = "muted" }: { label: string; tone?: "danger" | "warning" | "success" | "muted" }) {
  const toneStyles =
    tone === "danger"
      ? { background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)" }
      : tone === "warning"
        ? { background: "rgba(59, 130, 246, 0.1)", color: "var(--data-ink)" }
        : tone === "success"
          ? { background: "rgba(79, 70, 229, 0.12)", color: "var(--data-indigo)" }
          : { background: "rgba(37, 99, 235, 0.08)", color: "var(--muted-strong)" };

  return (
    <span
      className="ui-sans"
      style={{
        display: "inline-flex",
        padding: "8px 12px",
        borderRadius: 999,
        background: toneStyles.background,
        color: toneStyles.color,
        fontWeight: 700,
        fontSize: "0.84rem",
      }}
    >
      {label}
    </span>
  );
}

const actionButtonStyle = {
  border: "1px solid var(--border)",
  background: "rgba(255,255,255,0.84)",
  padding: "10px 14px",
  borderRadius: 999,
  fontWeight: 700,
} satisfies CSSProperties;
