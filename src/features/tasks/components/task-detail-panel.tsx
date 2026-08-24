"use client";

import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRef, useState } from "react";

import { ConfirmDialog } from "@/shared/components/common/confirm-dialog";
import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";
import { TaskDetailPropertyList, TaskDetailTags } from "@/features/tasks/components/task-detail-sections";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import { formatTagsInput } from "@/features/tasks/utils/task-tags";

type TaskDetailPanelProps = {
  task: Task | null;
  onUpdateTask: (id: string, values: TaskFormValues) => void | Promise<void>;
  onUpdateStatus: (id: string, status: Task["status"]) => void | Promise<void>;
  onDeleteTask: (id: string) => void | Promise<void>;
};

type TaskDetailTab = "details" | "activity";

type TaskActivityItem = {
  id: "created" | "updated" | "completed";
  label: string;
  description: string;
  occurredAt: string;
};

export function TaskDetailPanel({ task, onUpdateTask, onUpdateStatus, onDeleteTask }: TaskDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TaskDetailTab>("details");
  const detailsTabRef = useRef<HTMLButtonElement | null>(null);
  const activityTabRef = useRef<HTMLButtonElement | null>(null);

  if (!task) {
    return (
      <aside className="task-detail-panel task-detail-panel--empty" aria-label="任务详情">
        <div>
          <p className="task-detail-panel__empty-label">详情</p>
          <h2>没有选中任务</h2>
          <p>选择一条任务后，会在这里看到详情。</p>
        </div>
      </aside>
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
  const activityItems = buildTaskActivity(task);

  const handleTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, currentTab: TaskDetailTab) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const nextTab =
      event.key === "Home"
        ? "details"
        : event.key === "End"
          ? "activity"
          : currentTab === "details"
            ? "activity"
            : "details";

    setActiveTab(nextTab);
    (nextTab === "details" ? detailsTabRef : activityTabRef).current?.focus();
  };

  return (
    <aside className="task-detail-panel" aria-label="任务详情">
      <header className="task-detail-panel__header">
        <div className="task-detail-panel__tabs" role="tablist" aria-label="任务详情视图">
          <button
            ref={detailsTabRef}
            id="task-detail-tab-details"
            type="button"
            role="tab"
            aria-selected={activeTab === "details"}
            aria-controls="task-detail-panel-details"
            tabIndex={activeTab === "details" ? 0 : -1}
            className={
              activeTab === "details"
                ? "task-detail-panel__tab task-detail-panel__tab--active"
                : "task-detail-panel__tab"
            }
            onClick={() => setActiveTab("details")}
            onKeyDown={(event) => handleTabKeyDown(event, "details")}
          >
            详情
          </button>
          <button
            ref={activityTabRef}
            id="task-detail-tab-activity"
            type="button"
            role="tab"
            aria-selected={activeTab === "activity"}
            aria-controls="task-detail-panel-activity"
            tabIndex={activeTab === "activity" ? 0 : -1}
            className={
              activeTab === "activity"
                ? "task-detail-panel__tab task-detail-panel__tab--active"
                : "task-detail-panel__tab"
            }
            onClick={() => setActiveTab("activity")}
            onKeyDown={(event) => handleTabKeyDown(event, "activity")}
          >
            活动
          </button>
        </div>
      </header>

      {activeTab === "details" ? (
        <div
          id="task-detail-panel-details"
          role="tabpanel"
          aria-labelledby="task-detail-tab-details"
          className="task-detail-panel__content"
        >
          <section className="task-detail-panel__summary">
            <div>
              <h2>{task.title}</h2>
              <p>{task.description || "暂无描述"}</p>
            </div>
          </section>

          <TaskDetailPropertyList
            task={task}
            onStatusClick={() => void onUpdateStatus(task.id, task.status === "done" ? "todo" : "done")}
          />
          <TaskDetailTags task={task} />
        </div>
      ) : (
        <section
          id="task-detail-panel-activity"
          role="tabpanel"
          aria-labelledby="task-detail-tab-activity"
          className="task-detail-panel__activity"
        >
          <div className="task-detail-panel__activity-head">
            <h2>任务活动</h2>
            <p>仅展示任务记录中可以确认的时间节点。</p>
          </div>
          <ol className="task-detail-panel__timeline">
            {activityItems.map((item) => (
              <li
                key={item.id}
                className={`task-detail-panel__timeline-item task-detail-panel__timeline-item--${item.id}`}
              >
                <span className="task-detail-panel__timeline-marker" aria-hidden="true" />
                <div>
                  <div className="task-detail-panel__timeline-meta">
                    <strong>{item.label}</strong>
                    <time dateTime={item.occurredAt}>{formatDateTime(item.occurredAt)}</time>
                  </div>
                  <p>{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

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

function buildTaskActivity(task: Task): TaskActivityItem[] {
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

function isSameTimestamp(left: string, right: string) {
  return toTimestamp(left) === toTimestamp(right);
}

function toTimestamp(value: string) {
  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
