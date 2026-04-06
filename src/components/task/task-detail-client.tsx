"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { TaskFormDialog } from "@/components/task/task-form-dialog";
import { TaskPriorityBadge } from "@/components/task/task-priority-badge";
import { TaskStatusBadge } from "@/components/task/task-status-badge";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";
import { formatTagsInput } from "@/features/tasks/utils/task-tags";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { useTaskStore } from "@/store/task-store";

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
          <p style={{ margin: 0, color: "var(--muted)" }}>正在从 Supabase 加载任务详情...</p>
        </section>
      </PageContainer>
    );
  }

  if (!task) {
    return (
      <PageContainer>
        <Link href="/tasks" style={{ display: "inline-block", marginBottom: 20, color: "var(--muted)" }}>
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
        description: "这条任务已经从当前工作台中移除。",
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
      <Link href="/tasks" style={{ display: "inline-block", marginBottom: 20, color: "var(--muted)" }}>
        返回任务列表
      </Link>
      <section className="card-surface" style={{ borderRadius: 28, padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p
              style={{
                margin: 0,
                color: "var(--primary)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 700,
                fontSize: "0.8rem",
              }}
            >
              任务详情
            </p>
            <h1 style={{ margin: "10px 0 0", fontSize: "2rem" }}>{task.title}</h1>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <TaskStatusBadge status={task.status} />
            <TaskPriorityBadge priority={task.priority} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <button
            type="button"
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
            dialogTitle="修改这条任务的内容"
            submitLabel="保存修改"
          />
          <ConfirmDialog
            triggerLabel="删除任务"
            title="确认删除这条任务？"
            description="删除后它会从当前工作台中移除，并跳回任务列表。"
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
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
            {taskTags.map((tag) => (
              <span
                key={tag}
                style={{
                  display: "inline-flex",
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: "rgba(44, 122, 90, 0.12)",
                  color: "var(--success)",
                  fontWeight: 700,
                  fontSize: "0.86rem",
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 18,
            marginTop: 24,
          }}
        >
          <div style={{ padding: 18, borderRadius: 20, background: "rgba(255,255,255,0.72)" }}>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>截止日期</p>
            <p style={{ margin: "8px 0 0", fontWeight: 700 }}>{task.dueDate ?? "未设置"}</p>
            <p
              style={{
                margin: "8px 0 0",
                color:
                  dueMeta.tone === "danger"
                    ? "var(--danger)"
                    : dueMeta.tone === "warning"
                      ? "var(--warning)"
                      : dueMeta.tone === "success"
                        ? "var(--success)"
                        : "var(--muted)",
                fontWeight: 700,
              }}
            >
              {dueMeta.label}
            </p>
          </div>
          <div style={{ padding: 18, borderRadius: 20, background: "rgba(255,255,255,0.72)" }}>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>归属人</p>
            <p style={{ margin: "8px 0 0", fontWeight: 700 }}>你</p>
          </div>
          <div style={{ padding: 18, borderRadius: 20, background: "rgba(255,255,255,0.72)" }}>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>创建时间</p>
            <p style={{ margin: "8px 0 0", fontWeight: 700 }}>{formatDateLabel(task.createdAt)}</p>
          </div>
        </div>

        <div style={{ marginTop: 28 }}>
          <h2 style={{ margin: 0, fontSize: "1.15rem" }}>任务说明</h2>
          <p style={{ margin: "12px 0 0", color: "var(--muted)", lineHeight: 1.8 }}>{task.description}</p>
        </div>
      </section>
    </PageContainer>
  );
}

const actionButtonStyle = {
  border: "1px solid var(--border)",
  background: "rgba(255,255,255,0.76)",
  padding: "10px 14px",
  borderRadius: 999,
  fontWeight: 700,
} satisfies React.CSSProperties;

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
