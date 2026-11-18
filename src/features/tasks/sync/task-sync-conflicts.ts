import { requestJson } from "@/shared/lib/api/client";
import { getDesktopBridge } from "@/shared/lib/desktop/bridge";
import type { Task } from "../types/task.types";
import type { TaskSyncConflict, TaskSyncResolution } from "../types/task-sync.types";

function queue() {
  const bridge = getDesktopBridge()?.syncQueue;
  if (!bridge?.conflicts || !bridge.refreshConflict || !bridge.resolve || !bridge.resolution)
    throw new Error("请更新桌面应用后处理同步冲突。");
  return bridge as Required<typeof bridge>;
}
export async function refreshTaskSyncConflict(
  accountId: string,
  conflict: Pick<TaskSyncConflict, "taskId" | "operationId">,
) {
  const { task } = await requestJson<{ task: Task }>(`/api/tasks/${encodeURIComponent(conflict.taskId)}/sync-state`, {
    cache: "no-store",
  });
  await queue().refreshConflict({
    accountId,
    taskId: conflict.taskId,
    operationId: conflict.operationId,
    remote: task,
  });
}
export async function resolveTaskSyncConflict(
  accountId: string,
  conflict: TaskSyncConflict,
  ids: { resolutionId: string; copyTaskId: string },
  mode: "keep_both" | "use_cloud",
  discardConfirmed = false,
): Promise<TaskSyncResolution> {
  const bridge = queue();
  const receipt = await bridge.resolution({ accountId, resolutionId: ids.resolutionId });
  if (receipt) return receipt;
  const { task } = await requestJson<{ task: Task }>(`/api/tasks/${encodeURIComponent(conflict.taskId)}/sync-state`, {
    cache: "no-store",
  });
  try {
    return await bridge.resolve({
      accountId,
      ...ids,
      taskId: conflict.taskId,
      operationId: conflict.operationId,
      mode,
      discardConfirmed,
      expectedRemote: conflict.remote,
      remote: task,
    });
  } catch (error) {
    const saved = await bridge.resolution({ accountId, resolutionId: ids.resolutionId }).catch(() => null);
    if (saved) return saved;
    // Recheck on the next choice; never silently apply a choice to a newer cloud version.
    if (JSON.stringify(task) !== JSON.stringify(conflict.remote))
      await bridge
        .refreshConflict({ accountId, taskId: conflict.taskId, operationId: conflict.operationId, remote: task })
        .catch(() => undefined);
    throw error;
  }
}
