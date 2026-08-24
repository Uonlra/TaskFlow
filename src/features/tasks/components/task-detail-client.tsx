"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ConfirmDialog } from "@/shared/components/common/confirm-dialog";
import { EmptyState } from "@/shared/components/common/empty-state";
import { PageContainer } from "@/shared/components/layout/page-container";
import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";
import {
  TaskDetailActivity,
  TaskDetailDescription,
  TaskDetailHero,
  TaskDetailMoreContent,
  TaskDetailPropertyList,
  TaskDetailTags,
} from "@/features/tasks/components/task-detail-sections";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import { formatTagsInput } from "@/features/tasks/utils/task-tags";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useToast } from "@/shared/providers/toast-provider";
import { useTaskStore } from "@/features/tasks/store/task-store";

const statusFlow = ["todo", "in_progress", "done"] as const;

export function TaskDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { user, isConfigured } = useAuth();
  const { showToast } = useToast();
  const storedTask = useTaskStore((state) => state.tasks.find((item) => item.id === id));
  const isLoading = useTaskStore((state) => state.isLoading);
  const lastLoadedUserId = useTaskStore((state) => state.lastLoadedUserId);
  const syncTasks = useTaskStore((state) => state.syncTasks);
  const updateTask = useTaskStore((state) => state.updateTask);
  const updateTaskStatus = useTaskStore((state) => state.updateTaskStatus);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const [fetchedTask, setFetchedTask] = useState<Task | null>(null);
  const [finishedRequestId, setFinishedRequestId] = useState<string | null>(null);

  const task = (fetchedTask?.id === id ? fetchedTask : null) ?? storedTask;
  const isDetailLoading = Boolean(isConfigured && user?.id && finishedRequestId !== id);

  useEffect(() => {
    if (isConfigured && !isLoading && user?.id && lastLoadedUserId !== user.id) {
      void syncTasks(user.id);
    }
  }, [isConfigured, isLoading, lastLoadedUserId, syncTasks, user?.id]);

  useEffect(() => {
    if (!isConfigured || !user?.id) {
      return;
    }

    let cancelled = false;

    void fetch(`/api/tasks/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as { task?: Task } | null;
        if (!response.ok || !payload?.task) {
          throw new Error("无法加载任务详情。");
        }

        if (!cancelled) {
          setFetchedTask(payload.task);
        }
      })
      .catch(() => {
        // The global task sync remains the fallback for an already loaded task.
      })
      .finally(() => {
        if (!cancelled) {
          setFinishedRequestId(id);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, isConfigured, user?.id]);

  if (isConfigured && (isDetailLoading || isLoading) && !task) {
    return (
      <PageContainer>
        <section className="task-detail-state task-detail-state--loading">
          <p>正在从 Appwrite 读取任务详情...</p>
        </section>
      </PageContainer>
    );
  }

  if (!task) {
    return (
      <PageContainer>
        <Link href="/tasks" className="task-detail-state__back">
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

  const handleStatusChange = async () => {
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
  };

  return (
    <PageContainer>
      <div className="task-detail-page">
        <div className="task-detail-page__toolbar">
          <Link href="/tasks" className="task-detail-page__back">
            返回任务列表
          </Link>
          <span>任务工作台</span>
        </div>

        <div className="task-detail-layout">
          <main className="task-detail-main">
            <TaskDetailHero task={task} />
            <TaskDetailDescription task={task} />
            <TaskDetailActivity task={task} />
            <TaskDetailMoreContent />
          </main>

          <aside className="task-detail-sidebar" aria-label="任务属性与操作">
            <section className="task-detail-sidebar__section">
              <div className="task-detail-sidebar__heading">
                <p className="task-detail-kicker">属性</p>
                <h2>任务信息</h2>
              </div>
              <TaskDetailPropertyList task={task} includeOwner />
            </section>
            <TaskDetailTags task={task} />
            <section className="task-detail-sidebar__section task-detail-actions">
              <p className="task-detail-kicker">操作</p>
              <div className="task-detail-actions__grid">
                <button type="button" className="task-detail-action" onClick={() => void handleStatusChange()}>
                  切换状态
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
                  triggerClassName="task-detail-action task-detail-action--danger"
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </PageContainer>
  );
}
