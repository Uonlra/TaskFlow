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
        className={dueMeta.isOverdue ? "task-card task-card--compact task-card--attention" : "task-card task-card--compact"}
      >
        <div className="task-card__header">
          <div>
            <h3 className="task-card__title">{task.title}</h3>
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
      className={dueMeta.isOverdue ? "task-card task-card--attention" : "task-card"}
    >
      <div className="task-card__header">
        <div>
          <h3 className="task-card__title">{task.title}</h3>
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
        <button
          type="button"
          onClick={() => onUpdateStatus?.(task.id, nextStatus)}
          className="tesla-action tesla-action--secondary"
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
          triggerClassName="tesla-action tesla-action--danger"
        />
      </div>
    </article>
  );
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
