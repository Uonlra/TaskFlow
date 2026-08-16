"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ConfirmDialog } from "@/shared/components/common/confirm-dialog";
import { EmptyState } from "@/shared/components/common/empty-state";
import { PageContainer } from "@/shared/components/layout/page-container";
import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";
import { TaskPriorityBadge } from "@/features/tasks/components/task-priority-badge";
import { TaskStatusBadge } from "@/features/tasks/components/task-status-badge";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";
import { formatTagsInput } from "@/features/tasks/utils/task-tags";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useToast } from "@/shared/providers/toast-provider";
import { useTaskStore } from "@/features/tasks/store/task-store";

const statusFlow = ["todo", "in_progress", "done"] as const;

export function TaskDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { user, isConfigured } = useAuth();
  const { showToast } = useToast();
  const task = useTaskStore((state) => state.tasks.find((item) => item.id === id));
  const isLoading = useTaskStore((state) => state.isLoading);
  const lastLoadedUserId = useTaskStore((state) => state.lastLoadedUserId);
  const syncTasks = useTaskStore((state) => state.syncTasks);
  const updateTask = useTaskStore((state) => state.updateTask);
  const updateTaskStatus = useTaskStore((state) => state.updateTaskStatus);
  const deleteTask = useTaskStore((state) => state.deleteTask);

  useEffect(() => {
    if (isConfigured && user?.id && lastLoadedUserId !== user.id) {
      void syncTasks(user.id);
    }
  }, [isConfigured, lastLoadedUserId, syncTasks, user?.id]);

  if (isConfigured && isLoading && !task) {
    return (
      <PageContainer>
        <section className="card-surface" style={{ borderRadius: 28, padding: 28 }}>
          <p style={{ margin: 0, color: "var(--muted-strong)" }}>正在从 Appwrite 读取任务详情...</p>
        </section>
      </PageContainer>
    );
  }

  if (!task) {
    return (
      <PageContainer>
        <Link
          href="/tasks"
          className="ui-sans"
          style={{ display: "inline-block", marginBottom: 20, color: "var(--muted)" }}
        >
          返回任务列表
        </Link>
        <EmptyState
          title="没有找到这条任务"
          description="它可能已经从当前浏览器存储中删除，或者属于更早的一次本地会话。"
        />
      </PageContainer>
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
  const dueMeta = getTaskDueMeta(task);
  const taskTags = task.tags ?? [];

  const handleDelete = async () => {
    try {
      await deleteTask(task.id, user?.id);
      showToast({
        title: "任务已删除",
        description: "这条任务已经从当前任务本中移除。",
        tone: "success",
      });
      router.push("/tasks");
    } catch (error) {
      showToast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "请稍后再试。",
        tone: "error",
      });
      throw error;
    }
  };

  return (
    <PageContainer>
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}
      >
        <Link
          href="/tasks"
          className="ui-sans"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.84)",
            color: "var(--muted-strong)",
            fontWeight: 700,
          }}
        >
          返回任务列表
        </Link>
        <p className="ui-sans" style={{ margin: 0, color: "var(--muted)", fontSize: "0.92rem" }}>
          进入详情后，先确认状态、截止时间和说明是否还准确。
        </p>
      </div>
      <section
        className="card-surface dashboard-highlight-card"
        style={{
          borderRadius: 30,
          padding: 28,
          background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(247,250,255,0.86))",
        }}
      >
        <div style={{ display: "grid", gap: 18 }}>
          <div
            style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "start" }}
          >
            <div>
              <p
                className="section-eyebrow"
                style={{ margin: 0, color: "var(--primary)", fontWeight: 700, fontSize: "0.82rem" }}
              >
                任务详情
              </p>
              <h1 style={{ margin: "12px 0 0", fontSize: "clamp(2rem, 4vw, 2.8rem)", lineHeight: 1.18 }}>
                {task.title}
              </h1>
              <p style={{ margin: "12px 0 0", maxWidth: 700, color: "var(--muted-strong)", lineHeight: 1.82 }}>
                这里放着这条任务的状态、截止信息、标签与说明，方便你回到细节时快速接上思路。
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <TaskStatusBadge status={task.status} />
              <TaskPriorityBadge priority={task.priority} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="ui-sans"
              onClick={async () => {
                try {
                  await updateTaskStatus(task.id, nextStatus, user?.id);
                  showToast({
                    title: "状态已更新",
                    description: `任务已切换为${nextStatus === "todo" ? "待开始" : nextStatus === "in_progress" ? "进行中" : "已完成"}。`,
                    tone: "success",
                  });
                } catch (error) {
                  showToast({
                    title: "状态更新失败",
                    description: error instanceof Error ? error.message : "请稍后再试。",
                    tone: "error",
                  });
                }
              }}
              style={actionButtonStyle}
            >
              切换为{nextStatus === "todo" ? "待开始" : nextStatus === "in_progress" ? "进行中" : "已完成"}
            </button>
            <TaskFormDialog
              onSubmitTask={async (values) => {
                try {
                  await updateTask(task.id, values, user?.id);
                  showToast({
                    title: "任务已更新",
                    description: `“${values.title}” 的修改已经保存。`,
                    tone: "success",
                  });
                } catch (error) {
                  showToast({
                    title: "更新失败",
                    description: error instanceof Error ? error.message : "请稍后再试。",
                    tone: "error",
                  });
                  throw error;
                }
              }}
              initialValues={taskValues}
              triggerLabel="编辑任务"
              dialogEyebrow="编辑任务"
              dialogTitle="调整这条任务"
              submitLabel="保存修改"
            />
            <ConfirmDialog
              triggerLabel="删除任务"
              title="确认删除这条任务？"
              description="删除后它会从当前任务本中移除，并跳回任务列表。"
              confirmLabel="确认删除"
              confirmTone="danger"
              onConfirm={handleDelete}
              triggerStyle={{
                ...actionButtonStyle,
                color: "var(--danger)",
              }}
            />
          </div>

          {taskTags.length ? (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {taskTags.map((tag) => (
                <span
                  key={tag}
                  className="ui-sans"
                  style={{
                    display: "inline-flex",
                    padding: "8px 12px",
                    borderRadius: 999,
                    background: "rgba(79,70,229,0.12)",
                    color: "var(--data-indigo)",
                    fontWeight: 700,
                    fontSize: "0.86rem",
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 18,
        }}
      >
        <InfoCard title="截止日期" value={task.dueDate ?? "未设置"} helper={dueMeta.label} helperTone={dueMeta.tone} />
        <InfoCard title="归属人" value="你" helper="当前账号下的任务详情" />
        <InfoCard title="创建时间" value={formatDateLabel(task.createdAt)} helper="用于回看任务被记下的时间点" />
      </section>

      <section
        className="card-surface"
        style={{
          borderRadius: 28,
          padding: 24,
          background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(249,251,255,0.84))",
        }}
      >
        <p
          className="section-eyebrow"
          style={{ margin: 0, color: "var(--data-ink)", fontWeight: 700, fontSize: "0.82rem" }}
        >
          说明
        </p>
        <h2 style={{ margin: "10px 0 0", fontSize: "1.18rem" }}>任务说明</h2>
        <p style={{ margin: "14px 0 0", color: "var(--muted-strong)", lineHeight: 1.86 }}>{task.description}</p>
      </section>
    </PageContainer>
  );
}

const actionButtonStyle = {
  border: "1px solid var(--border)",
  background: "rgba(255,255,255,0.84)",
  padding: "10px 14px",
  borderRadius: 999,
  fontWeight: 700,
} satisfies React.CSSProperties;

function InfoCard({
  title,
  value,
  helper,
  helperTone = "muted",
}: {
  title: string;
  value: string;
  helper: string;
  helperTone?: "danger" | "warning" | "success" | "muted";
}) {
  const helperColor =
    helperTone === "danger"
      ? "var(--danger)"
      : helperTone === "warning"
        ? "var(--data-ink)"
        : helperTone === "success"
          ? "var(--data-indigo)"
          : "var(--muted)";

  return (
    <div
      className="card-surface"
      style={{
        borderRadius: 24,
        padding: 20,
        background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(247,250,255,0.82))",
      }}
    >
      <p className="ui-sans" style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem", fontWeight: 600 }}>
        {title}
      </p>
      <p style={{ margin: "10px 0 0", fontWeight: 700, fontSize: "1.08rem" }}>{value}</p>
      <p className="ui-sans" style={{ margin: "10px 0 0", color: helperColor, fontWeight: 700, lineHeight: 1.7 }}>
        {helper}
      </p>
    </div>
  );
}

function formatDateLabel(value: string) {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }

  return timestamp.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
