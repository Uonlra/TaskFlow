"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import type { Task } from "@/features/tasks/types/task.types";
import { parseTaskDueDateValue } from "@/features/tasks/utils/task-date-filters";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";
import { TaskPriorityBadge } from "@/features/tasks/components/task-priority-badge";
import { TaskStatusBadge } from "@/features/tasks/components/task-status-badge";

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

export function TaskDetailHero({ task }: { task: Task }) {
  return (
    <section className="task-detail-hero">
      <div className="task-detail-hero__copy">
        <p className="task-detail-kicker">任务详情</p>
        <h1>{task.title}</h1>
        <p className="task-detail-hero__summary">{task.description || "暂无描述。"}</p>
      </div>
      <div className="task-detail-hero__badges" aria-label="任务状态和优先级">
        <TaskStatusBadge status={task.status} />
        <TaskPriorityBadge priority={task.priority} />
      </div>
    </section>
  );
}

export function TaskDetailPropertyList({
  task,
  includeOwner = false,
  onStatusClick,
}: {
  task: Task;
  includeOwner?: boolean;
  onStatusClick?: () => void;
}) {
  const dueMeta = getTaskDueMeta(task);

  return (
    <div className="task-detail-properties">
      <TaskDetailProperty label="状态">
        {onStatusClick ? (
          <button
            type="button"
            className={`task-detail-status task-detail-status--${task.status}`}
            onClick={onStatusClick}
          >
            {statusLabel[task.status]}
          </button>
        ) : (
          <span className={`task-detail-status task-detail-status--${task.status}`}>{statusLabel[task.status]}</span>
        )}
      </TaskDetailProperty>
      <TaskDetailProperty label="优先级">
        <span className="task-detail-priority">
          <span
            className={`task-detail-priority__dot task-detail-priority__dot--${task.priority}`}
            aria-hidden="true"
          />
          {priorityLabel[task.priority]}
        </span>
      </TaskDetailProperty>
      <TaskDetailProperty label="截止时间">
        <span className={`task-detail-due task-detail-due--${dueMeta.tone}`}>
          {formatDate(task.dueDate) || dueMeta.label}
        </span>
      </TaskDetailProperty>
      {includeOwner ? <TaskDetailProperty label="归属人">你</TaskDetailProperty> : null}
      <TaskDetailProperty label="创建时间">{formatDateTime(task.createdAt)}</TaskDetailProperty>
      <TaskDetailProperty label="更新时间">
        {task.updatedAt ? formatDateTime(task.updatedAt) : "未更新"}
      </TaskDetailProperty>
      <TaskDetailProperty label="完成时间">
        {task.completedAt ? formatDateTime(task.completedAt) : "未完成"}
      </TaskDetailProperty>
    </div>
  );
}

export function TaskDetailProperty({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="task-detail-property">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}

export function TaskDetailTags({ task }: { task: Task }) {
  return (
    <section className="task-detail-tags-board" aria-labelledby="task-detail-tags-title">
      <div className="task-detail-tags-board__head">
        <h2 id="task-detail-tags-title">标签</h2>
        <span>{task.tags.length ? `${task.tags.length} 个` : "未添加"}</span>
      </div>
      {task.tags.length ? (
        <div className="task-detail-tags" aria-label="任务标签">
          {task.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
      ) : (
        <p className="task-detail-tags-board__empty">暂无标签，可通过编辑任务添加。</p>
      )}
    </section>
  );
}

export function TaskDetailDescription({ task }: { task: Task }) {
  return (
    <section className="task-detail-description">
      <p className="task-detail-kicker">说明</p>
      <h2>任务说明</h2>
      <p>{task.description || "暂无描述。"}</p>
    </section>
  );
}

type TaskActivityItem = {
  id: "created" | "updated" | "completed";
  label: string;
  description: string;
  occurredAt: string;
};

export function TaskDetailActivity({ task }: { task: Task }) {
  const activityItems = buildTaskActivity(task);

  return (
    <section className="task-detail-activity" aria-labelledby="task-detail-activity-title">
      <div className="task-detail-activity__head">
        <div>
          <p className="task-detail-kicker">活动</p>
          <h2 id="task-detail-activity-title">任务活动</h2>
        </div>
        <p>仅展示任务记录中可以确认的时间节点。</p>
      </div>
      <ol className="task-detail-timeline">
        {activityItems.map((item) => (
          <li key={item.id} className={`task-detail-timeline__item task-detail-timeline__item--${item.id}`}>
            <span className="task-detail-timeline__marker" aria-hidden="true" />
            <div>
              <div className="task-detail-timeline__meta">
                <strong>{item.label}</strong>
                <time dateTime={item.occurredAt}>{formatDateTime(item.occurredAt)}</time>
              </div>
              <p>{item.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function TaskDetailMoreContent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className={`task-detail-more-content${isOpen ? " is-open" : ""}`}>
      <button
        type="button"
        className="task-detail-more-content__trigger"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>更多内容</span>
        <span className="task-detail-more-content__icon" aria-hidden="true">
          {isOpen ? "-" : "+"}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            className="task-detail-more-content__body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="task-detail-more-content__grid">
              <div>
                <h3>子任务</h3>
                <p>暂无子任务，后续可在这里拆分执行步骤。</p>
              </div>
              <div>
                <h3>评论与附件</h3>
                <p>评论和附件功能尚未启用。</p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

export function buildTaskActivity(task: Task): TaskActivityItem[] {
  const items: TaskActivityItem[] = [
    {
      id: "created",
      label: "创建任务",
      description: "任务在此时间创建。",
      occurredAt: task.createdAt,
    },
  ];

  if (task.updatedAt && !isSameTimestamp(task.updatedAt, task.createdAt)) {
    items.push({
      id: "updated",
      label: "最近更新",
      description: "任务记录在此时间最后更新。",
      occurredAt: task.updatedAt,
    });
  }

  if (task.completedAt) {
    items.push({
      id: "completed",
      label: "完成任务",
      description: "任务在此时间完成。",
      occurredAt: task.completedAt,
    });
  }

  return items.sort((left, right) => toTimestamp(right.occurredAt) - toTimestamp(left.occurredAt));
}

export function formatDate(value: string | undefined) {
  if (!value) {
    return "";
  }

  const date = parseTaskDueDateValue(value);

  if (!date) {
    return value;
  }

  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

export function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function isSameTimestamp(left: string, right: string) {
  return toTimestamp(left) === toTimestamp(right);
}

function toTimestamp(value: string) {
  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}
