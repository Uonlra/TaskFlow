"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ChevronDown, SlidersHorizontal } from "lucide-react";

import { ConfirmDialog } from "@/shared/components/common/confirm-dialog";
import { EmptyState } from "@/shared/components/common/empty-state";
import { PageContainer } from "@/shared/components/layout/page-container";
import { TaskExplorationWorkspace } from "./task-exploration-workspace";
import { evolutionActionLabels } from "./task-evolution-action-form";
import type { TaskEvolutionCommand } from "@/features/tasks/schemas/task-evolution-schema";
import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";
import {
  TaskDetailHero,
  TaskDetailPropertyList,
  TaskDetailTags,
} from "@/features/tasks/components/task-detail-sections";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import { formatTagsInput } from "@/features/tasks/utils/task-tags";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { getTaskRepository } from "@/features/tasks/repositories/task-repository-selector";
import { useToast } from "@/shared/providers/toast-provider";
import { useTaskStore } from "@/features/tasks/store/task-store";
import type { TaskEvolutionTarget } from "@/features/tasks/utils/task-evolution-navigation";

const statusFlow = ["todo", "in_progress", "done"] as const;

export function TaskDetailClient({
  id,
  initiallyEditing = false,
  evolutionTarget,
}: {
  id: string;
  initiallyEditing?: boolean;
  evolutionTarget?: TaskEvolutionTarget;
}) {
  const router = useRouter();
  const { user, isConfigured, isLoading: isAuthLoading } = useAuth();
  const { showToast } = useToast();
  const storedTask = useTaskStore((state) => state.tasks.find((item) => item.id === id));
  const isLoading = useTaskStore((state) => state.isLoading);
  const lastLoadedUserId = useTaskStore((state) => state.lastLoadedUserId);
  const syncTasks = useTaskStore((state) => state.syncTasks);
  const updateTask = useTaskStore((state) => state.updateTask);
  const updateTaskStatus = useTaskStore((state) => state.updateTaskStatus);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const executeEvolution = useTaskStore((state) => state.executeEvolution);
  const [fetchedRecord, setFetchedRecord] = useState<{ owner: string; task: Task } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const mutationEpoch = useRef(0);
  const metadataRef = useRef<HTMLDetailsElement>(null);
  const owner = user?.id ?? "guest";
  const setFetchedTask = (task: Task) => setFetchedRecord({ owner, task });
  const [finishedRequestId, setFinishedRequestId] = useState<string | null>(null);
  const [statusAnimationKey, setStatusAnimationKey] = useState(0);

  const fetchedTask = fetchedRecord?.owner === owner && fetchedRecord.task.id === id ? fetchedRecord.task : undefined;
  const visibleStoredTask = lastLoadedUserId === (user?.id ?? null) ? storedTask : undefined;
  const task = selectLatestTask(fetchedTask, visibleStoredTask);
  const isDetailLoading = Boolean(isConfigured && user?.id && finishedRequestId !== id);

  useEffect(() => {
    function closeMetadata(event: PointerEvent | globalThis.KeyboardEvent) {
      const panel = metadataRef.current;
      if (!panel?.open) return;
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        panel.open = false;
        panel.querySelector("summary")?.focus();
      } else if (event.target instanceof Node && !panel.contains(event.target)) {
        panel.open = false;
      }
    }
    document.addEventListener("pointerdown", closeMetadata);
    document.addEventListener("keydown", closeMetadata);
    return () => {
      document.removeEventListener("pointerdown", closeMetadata);
      document.removeEventListener("keydown", closeMetadata);
    };
  }, []);

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
    const epoch = ++mutationEpoch.current;

    void getTaskRepository(user.id)
      .get(id)
      .then((loadedTask) => {
        if (!loadedTask) throw new Error("无法加载任务详情。");
        if (!cancelled && epoch === mutationEpoch.current) {
          setFetchedRecord({ owner: user.id, task: loadedTask });
          setLoadError(null);
        }
      })
      .catch((error) => {
        if (!cancelled && epoch === mutationEpoch.current)
          setLoadError(error instanceof Error ? error.message : "无法加载任务详情。");
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

  if ((isAuthLoading || (isConfigured && (isDetailLoading || isLoading))) && !task) {
    return (
      <PageContainer>
        <section className="task-detail-state">
          <p>正在读取任务详情…</p>
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
          description={loadError ?? "它可能已经从当前浏览器存储中删除，或者属于更早的一次本地会话。"}
        />
      </PageContainer>
    );
  }

  const reloadTask = async () => {
    const epoch = ++mutationEpoch.current;
    if (!user?.id) {
      await syncTasks();
      const current = useTaskStore.getState().tasks.find((item) => item.id === id);
      if (!current) throw new Error("任务不存在或已删除。");
      if (epoch === mutationEpoch.current) {
        setFetchedTask(current);
        setLoadError(null);
      }
      return;
    }
    const current = await getTaskRepository(user.id).get(id);
    if (!current) throw new Error("任务不存在或已删除。");
    if (epoch === mutationEpoch.current) {
      setFetchedTask(current);
      setLoadError(null);
    }
  };
  const handleEvolution = async (command: TaskEvolutionCommand) => {
    ++mutationEpoch.current;
    const updated = await executeEvolution(task.id, command, user?.id);
    setFetchedTask(updated);
    setLoadError(null);
    setStatusAnimationKey((current) => current + 1);
    showToast({ title: `${evolutionActionLabels[command.action.type]}已保存`, tone: "success" });
    return updated;
  };

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
      ++mutationEpoch.current;
      await updateTaskStatus(task.id, nextStatus, user?.id);
      const updated = useTaskStore.getState().tasks.find((item) => item.id === task.id);
      if (updated) setFetchedTask(updated);
      setStatusAnimationKey((current) => current + 1);
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
            <ArrowLeft size={15} aria-hidden="true" />
            返回任务列表
          </Link>
        </div>

        <motion.div
          className="task-detail-layout"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          <div className="task-detail-main">
            <TaskDetailHero task={task} statusAnimationKey={statusAnimationKey} />
            {loadError ? (
              <p className="task-evolution-error" role="alert">
                {loadError}
              </p>
            ) : null}
            <TaskExplorationWorkspace
              key={`${owner}:${task.id}:${JSON.stringify(evolutionTarget)}`}
              task={task}
              initialTarget={evolutionTarget}
              onExecute={handleEvolution}
              onReload={reloadTask}
            />
          </div>

          <details ref={metadataRef} className="task-detail-metadata">
            <summary aria-label="任务信息与操作" title="任务信息与操作">
              <SlidersHorizontal size={16} aria-hidden="true" />
              <span>任务信息</span>
              <ChevronDown size={14} aria-hidden="true" />
            </summary>
            <aside className="task-detail-sidebar" aria-label="任务属性与操作" data-lenis-prevent-wheel="true">
              <section className="task-detail-sidebar__section">
                <div className="task-detail-sidebar__heading">
                  <h2>任务信息</h2>
                </div>
                <TaskDetailPropertyList task={task} includeOwner statusAnimationKey={statusAnimationKey} />
              </section>
              <TaskDetailTags task={task} />
              <section className="task-detail-sidebar__section task-detail-actions">
                <div className="task-detail-actions__grid">
                  {!task.evolution ? (
                    <button type="button" className="task-detail-action" onClick={() => void handleStatusChange()}>
                      切换状态
                    </button>
                  ) : null}
                  <TaskFormDialog
                    lockGoalAndStatus={Boolean(task.evolution)}
                    initiallyOpen={initiallyEditing}
                    onSubmitTask={async (values) => {
                      try {
                        ++mutationEpoch.current;
                        await updateTask(task.id, values, user?.id);
                        const updated = useTaskStore.getState().tasks.find((item) => item.id === task.id);
                        if (updated) setFetchedTask(updated);
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
          </details>
        </motion.div>
      </div>
    </PageContainer>
  );
}

function selectLatestTask(fetched: Task | undefined, stored: Task | undefined) {
  if (!fetched) return stored;
  if (!stored) return fetched;
  const revision = (fetched.evolution?.revision ?? -1) - (stored.evolution?.revision ?? -1);
  if (revision !== 0) return revision > 0 ? fetched : stored;
  return Date.parse(stored.updatedAt ?? stored.createdAt) > Date.parse(fetched.updatedAt ?? fetched.createdAt)
    ? stored
    : fetched;
}
