import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  appwriteFetch: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/shared/lib/appwrite/env", () => ({
  appwriteDatabaseId: "database-1",
  appwriteTasksTableId: "tasks-1",
  hasAppwriteDatabaseEnv: true,
}));
vi.mock("@/shared/lib/appwrite/request", () => ({
  appwriteFetch: mocks.appwriteFetch,
}));

import { listTasksByDueRange } from "@/shared/lib/appwrite/tasks";

describe("listTasksByDueRange", () => {
  beforeEach(() => vi.clearAllMocks());

  it("将日期边界映射为 Appwrite queries，并用轻量查询判断账号是否有任务", async () => {
    mocks.appwriteFetch
      .mockResolvedValueOnce({
        rows: [{ $id: "task-1", $createdAt: "2026-08-01T00:00:00.000Z", $updatedAt: "2026-08-01T00:00:00.000Z", title: "任务", description: "", status: "todo", priority: "high", dueDate: "2026-08-10T00:00:00.000Z" }],
      })
      .mockResolvedValueOnce({ total: 1, rows: [] });

    const result = await listTasksByDueRange("session-secret", { from: "2026-08-10", to: "2026-08-17" });

    expect(result).toMatchObject({ hasAnyTasks: true, tasks: [{ id: "task-1", dueDate: "2026-08-10" }] });
    const firstCall = mocks.appwriteFetch.mock.calls[0][0];
    expect(firstCall.searchParams.queries).toEqual([
      'isNotNull("dueDate")',
      'greaterThanEqual("dueDate","2026-08-10T00:00:00.000Z")',
      'lessThan("dueDate","2026-08-17T00:00:00.000Z")',
      'orderAsc("dueDate")',
      "limit(5000)",
    ]);
    expect(mocks.appwriteFetch.mock.calls[1][0].searchParams.queries).toEqual(["limit(1)"]);
  });
});
