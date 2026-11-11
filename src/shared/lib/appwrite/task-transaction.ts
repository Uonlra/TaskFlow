import "server-only";
import type { NextRequest } from "next/server";
import { appwriteDatabaseId, appwriteTasksTableId } from "./env";
import { appwriteFetch } from "./request";
import { appwriteTaskRowSchema, type AppwriteTaskRow } from "./schemas/task-row.schema";

/** Fence before reading so commit detects changes since the first staged write. */
export async function mutateTaskTransaction(
  sessionSecret: string,
  taskId: string,
  request: NextRequest | undefined,
  mutate: (row: AppwriteTaskRow) => Record<string, unknown> | null,
) {
  if (!appwriteDatabaseId || !appwriteTasksTableId) throw new Error("任务数据库尚未配置。");
  const tx = await appwriteFetch<{ $id: string }>({
    path: "/tablesdb/transactions",
    method: "POST",
    sessionSecret,
    request,
    body: { ttl: 60 },
  });
  const transactionPath = `/tablesdb/transactions/${encodeURIComponent(tx.$id)}`;
  const rowPath = `/tablesdb/${encodeURIComponent(appwriteDatabaseId)}/tables/${encodeURIComponent(appwriteTasksTableId)}/rows/${encodeURIComponent(taskId)}`;
  try {
    await appwriteFetch({
      path: rowPath,
      method: "PATCH",
      sessionSecret,
      request,
      body: { transactionId: tx.$id, data: { evolutionFence: true } },
    });
    // Read committed metadata: a transactional read could expose the fence's
    // staged $updatedAt and make offline snapshots look artificially stale.
    // Any external change after the fence still makes commit fail.
    const current = appwriteTaskRowSchema.parse(await appwriteFetch({ path: rowPath, sessionSecret, request }));
    const data = mutate(current);
    if (data === null) {
      await appwriteFetch({ path: transactionPath, method: "PATCH", sessionSecret, request, body: { rollback: true } });
      return current;
    }
    const updated = appwriteTaskRowSchema.parse(
      await appwriteFetch({
        path: rowPath,
        method: "PATCH",
        sessionSecret,
        request,
        body: { transactionId: tx.$id, data },
      }),
    );
    await appwriteFetch({ path: transactionPath, method: "PATCH", sessionSecret, request, body: { commit: true } });
    return updated;
  } catch (error) {
    await appwriteFetch({
      path: transactionPath,
      method: "PATCH",
      sessionSecret,
      request,
      body: { rollback: true },
    }).catch(() => undefined);
    throw error;
  }
}
