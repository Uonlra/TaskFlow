import type { Task } from "@/features/tasks/types/task.types";
import { requestJson } from "@/shared/lib/api/client";
import { getDesktopBridge, type DesktopSyncOperation } from "@/shared/lib/desktop/bridge";

type DesktopSyncResult = {
  operationId: string;
  taskId: string;
  status: "applied" | "stale" | "deleted" | "error";
  task?: Task;
  message?: string;
};

type DesktopSyncResponse = {
  results: DesktopSyncResult[];
};

const inFlightSyncs = new Map<string, Promise<{ processed: number; failed: number }>>();
const MAX_SYNC_BATCH_BYTES = 2000000;

export async function pullDesktopSyncRecords(): Promise<Task[]> {
  const tasks: Task[] = [];
  const cursors = new Set<string>();
  let cursor: string | null = null;
  do {
    const page: { tasks: Task[]; nextCursor: string | null } = await requestJson(
      `/api/tasks/sync${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
      { cache: "no-store" },
    );
    if (
      !Array.isArray(page?.tasks) ||
      !page.tasks.every(isTask) ||
      !(page.nextCursor === null || (typeof page.nextCursor === "string" && page.nextCursor.length > 0))
    ) {
      throw new Error("同步记录格式不正确。");
    }
    tasks.push(...page.tasks);
    cursor = page.nextCursor;
    if (cursor && cursors.has(cursor)) throw new Error("同步分页游标没有前进。");
    if (cursor) cursors.add(cursor);
  } while (cursor);
  return tasks;
}

export function flushDesktopSyncQueue(accountId: string) {
  const existing = inFlightSyncs.get(accountId);
  if (existing) return existing;

  const sync = runDesktopSyncQueue(accountId);
  inFlightSyncs.set(accountId, sync);
  const clearInFlight = () => {
    if (inFlightSyncs.get(accountId) === sync) inFlightSyncs.delete(accountId);
  };
  void sync.then(clearInFlight, clearInFlight);
  return sync;
}

async function runDesktopSyncQueue(accountId: string) {
  const bridge = getDesktopBridge();
  if (!bridge) return { processed: 0, failed: 0 };

  const pending = await bridge.syncQueue.list({ accountId, limit: 50 });
  const operations: DesktopSyncOperation[] = [];
  let batchBytes = 0;
  for (const operation of pending) {
    const size = new TextEncoder().encode(JSON.stringify(operation)).length;
    if (operations.length && batchBytes + size > MAX_SYNC_BATCH_BYTES) break;
    operations.push(operation);
    batchBytes += size;
  }
  if (!operations.length) return { processed: 0, failed: 0 };

  let payload: DesktopSyncResponse;
  try {
    payload = await requestJson<DesktopSyncResponse>("/api/tasks/sync", {
      method: "POST",
      body: { operations },
    });
  } catch (error) {
    await recordFailures(bridge, accountId, operations, error);
    throw error;
  }

  const resultByOperationId = new Map(
    (Array.isArray(payload?.results) ? payload.results : []).map((result) => [result.operationId, result]),
  );
  const acknowledged: Array<{ operationId: string }> = [];
  const failures: Array<{ operationId: string; message?: string }> = [];
  const remoteTasks: Task[] = [];

  for (const operation of operations) {
    const result = resultByOperationId.get(operation.operationId);
    if (!result || !isSuccessfulStatus(result.status)) {
      failures.push({
        operationId: operation.operationId,
        message: result?.message ?? "同步服务未返回结果。",
      });
      continue;
    }

    acknowledged.push({ operationId: operation.operationId });
    if (result.task && isTask(result.task)) remoteTasks.push(result.task);
  }

  if (bridge.syncQueue.settle) {
    try {
      await bridge.syncQueue.settle({ accountId, operations: acknowledged, tasks: remoteTasks });
    } catch (error) {
      await recordFailures(bridge, accountId, operations, error);
      throw error;
    }
  } else {
    if (
      remoteTasks.some((task) => task.evolution) ||
      operations.some(
        (operation) => operation.payload && typeof operation.payload === "object" && "evolution" in operation.payload,
      )
    ) {
      throw new Error("请更新桌面应用后同步探索记录。");
    }
    if (acknowledged.length) {
      await bridge.syncQueue.acknowledge({ accountId, operations: acknowledged });
    }

    if (remoteTasks.length) {
      await bridge.localTasks.upsert({ accountId, tasks: remoteTasks });
    }
  }

  if (failures.length) {
    await bridge.syncQueue.fail({ accountId, failures });
  }

  return { processed: acknowledged.length, failed: failures.length };
}

async function recordFailures(
  bridge: NonNullable<ReturnType<typeof getDesktopBridge>>,
  accountId: string,
  operations: DesktopSyncOperation[],
  error: unknown,
) {
  const message = error instanceof Error ? error.message : "同步请求失败。";
  await bridge.syncQueue
    .fail({
      accountId,
      failures: operations.map((operation) => ({ operationId: operation.operationId, message })),
    })
    .catch(() => undefined);
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const task = value as Partial<Task>;
  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    typeof task.description === "string" &&
    Array.isArray(task.tags) &&
    typeof task.createdAt === "string"
  );
}

function isSuccessfulStatus(
  status: DesktopSyncResult["status"] | undefined,
): status is "applied" | "stale" | "deleted" {
  return status === "applied" || status === "stale" || status === "deleted";
}
