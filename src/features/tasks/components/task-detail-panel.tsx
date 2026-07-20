"use client";

import type { ReactNode } from "react";

import { ConfirmDialog } from "@/shared/components/common/confirm-dialog";
import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";
import { formatTagsInput } from "@/features/tasks/utils/task-tags";

type TaskDetailPanelProps = {
  task: Task | null;
  onUpdateTask: (id: string, values: TaskFormValues) => void | Promise<void>;
  onUpdateStatus: (id: string, status: Task["status"]) => void | Promise<void>;
  onDeleteTask: (id: string) => void | Promise<void>;
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

export function TaskDetailPanel({ task, onUpdateTask, onUpdateStatus, onDeleteTask }: TaskDetailPanelProps) {
  if (!task) {
    return (
      <aside className="task-detail-panel task-detail-panel--empty" aria-label="任务详情">
        <div>
          <p className="task-detail-panel__tab">详情</p>
          <h2>没有选中任务</h2>
          <p>选择一条任务后，会在这里看到详情。</p>
        </div>
      </aside>
    );
  }

  const dueMeta = getTaskDueMeta(task);
  const taskValues: TaskFormValues = {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    tags: formatTagsInput(task.tags),
    dueDate: task.dueDate ?? "",
  };

  return (
    <aside className="task-detail-panel" aria-label="任务详情">
      <header className="task-detail-panel__header">
        <div className="task-detail-panel__tabs" aria-label="详情视图">
          <span className="task-detail-panel__tab task-detail-panel__tab--active">详情</span>
          <span className="task-detail-panel__tab">活动</span>
        </div>
      </header>

      <section className="task-detail-panel__summary">
        <div>
          <h2>{task.title}</h2>
          <p>{task.description || "暂无描述"}</p>
        </div>
      </section>

      <div className="task-detail-panel__fields">
        <DetailRow label="状态">
          <button
            type="button"
            className={`task-detail-status task-detail-status--${task.status}`}
            onClick={() => void onUpdateStatus(task.id, task.status === "done" ? "todo" : "done")}
          >
            {statusLabel[task.status]}
          </button>
        </DetailRow>

        <DetailRow label="优先级">
          <span className="task-detail-priority">
            <span className={`task-detail-priority__dot task-detail-priority__dot--${task.priority}`} />
            {priorityLabel[task.priority]}
          </span>
        </DetailRow>

        <DetailRow label="截止时间">
          <span className={`task-detail-due task-detail-due--${dueMeta.tone}`}>{formatDate(task.dueDate) || dueMeta.label}</span>
        </DetailRow>

        <DetailRow label="标签">
          <span className="task-detail-tags">
            {task.tags.length ? task.tags.map((tag) => <span key={tag}>{tag}</span>) : <span>无标签</span>}
          </span>
        </DetailRow>

        <DetailRow label="创建时间">
          <span>{formatDateTime(task.createdAt)}</span>
        </DetailRow>

        <DetailRow label="更新时间">
          <span>{task.updatedAt ? formatDateTime(task.updatedAt) : "未更新"}</span>
        </DetailRow>

        <DetailRow label="完成时间">
          <span>{task.completedAt ? formatDateTime(task.completedAt) : "未完成"}</span>
        </DetailRow>
      </div>

      <section className="task-detail-panel__note">
        <h3>备注</h3>
        <p>{task.description || "暂无备注"}</p>
      </section>

      <footer className="task-detail-panel__actions">
        <TaskFormDialog
          onSubmitTask={(values) => onUpdateTask(task.id, values)}
          initialValues={taskValues}
          triggerLabel="编辑"
          dialogEyebrow="编辑任务"
          dialogTitle="调整这条任务"
          submitLabel="保存修改"
        />
        <ConfirmDialog
          triggerLabel="删除"
          title="确认删除这条任务？"
          description="删除后会从当前任务本与浏览器本地存储中移除，无法恢复。"
          confirmLabel="确认删除"
          confirmTone="danger"
          onConfirm={() => onDeleteTask(task.id)}
          triggerClassName="tesla-action tesla-action--danger"
        />
      </footer>
    </aside>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="task-detail-row">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}

function formatDate(value: string | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

