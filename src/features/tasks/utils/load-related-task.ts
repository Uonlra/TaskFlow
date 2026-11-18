import { getTaskRepository } from "../repositories/task-repository-selector";
import { useTaskStore } from "../store/task-store";
import { getDesktopBridge } from "@/shared/lib/desktop/bridge";
import { requestJson } from "@/shared/lib/api/client";
import type { Task } from "../types/task.types";

export async function loadRelatedTask(
  taskId: string,
  userId: string | undefined,
  signal: AbortSignal,
): Promise<Task | null> {
  const bridge = getDesktopBridge();
  if (!bridge && !userId) {
    const state = useTaskStore.getState();
    return state.lastLoadedUserId === null
      ? (state.tasks.find((task) => task.id === taskId && !task.deletedAt) ?? null)
      : null;
  }
  const repository = getTaskRepository(userId);
  const task = await repository.get(taskId, { signal });
  if (task || !bridge) return task;
  const workspace = await bridge.workspace.get();
  if (!userId || workspace.accountId !== userId || !workspace.syncEnabled) return null;
  const { task: remote } = await requestJson<{ task: Task }>(`/api/tasks/${encodeURIComponent(taskId)}/sync-state`, {
    cache: "no-store",
    signal,
  });
  if (signal.aborted) return null;
  if (remote.id !== taskId) throw new Error("关联任务数据不匹配。");
  if (remote.deletedAt) return null;
  await bridge.localTasks.upsert({ accountId: workspace.accountId, tasks: [remote] });
  if (signal.aborted) return null;
  void useTaskStore.getState().syncTasks(userId);
  return repository.get(taskId, { signal });
}
