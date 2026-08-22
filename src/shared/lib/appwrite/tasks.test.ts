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

import { buildTaskPageQueries, listTasksByDueRange } from "@/shared/lib/appwrite/tasks";

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
      '{"method":"isNotNull","attribute":"dueDate"}',
      '{"method":"greaterThanEqual","attribute":"dueDate","values":["2026-08-10T00:00:00.000Z"]}',
      '{"method":"lessThan","attribute":"dueDate","values":["2026-08-17T00:00:00.000Z"]}',
      '{"method":"orderAsc","attribute":"dueDate"}',
      '{"method":"limit","values":[5000]}',
    ]);
    expect(mocks.appwriteFetch.mock.calls[1][0].searchParams.queries).toEqual(['{"method":"limit","values":[1]}']);
  });
});

describe("buildTaskPageQueries", () => {
  it("将可下沉的状态、优先级、日期范围和排序映射为 Appwrite queries", () => {
    const queries = buildTaskPageQueries({
      query: "",
      tag: "",
      status: "active",
      priority: "high",
      due: "",
      risk: "",
      date: "2026-08-10",
      range: "",
      sort: "created_desc",
    });

    expect(queries).toEqual([
      '{"method":"notEqual","attribute":"status","values":["done"]}',
      '{"method":"equal","attribute":"priority","values":["high"]}',
      '{"method":"greaterThanEqual","attribute":"dueDate","values":["2026-08-10T00:00:00.000Z"]}',
      '{"method":"lessThan","attribute":"dueDate","values":["2026-08-11T00:00:00.000Z"]}',
      '{"method":"orderDesc","attribute":"$createdAt"}',
    ]);
  });

  it("将临近截止定义为今天到三天后，并排除已完成任务", () => {
    const queries = buildTaskPageQueries({
      query: "",
      tag: "",
      status: "all",
      priority: "all",
      due: "near",
      risk: "",
      date: "",
      range: "",
      sort: "due_asc",
    });

    expect(queries).toContain('{"method":"notEqual","attribute":"status","values":["done"]}');
    expect(queries).toContain('{"method":"orderAsc","attribute":"dueDate"}');
    expect(queries.filter((query) => query.includes('"method":"greaterThanEqual"')).length).toBe(1);
    expect(queries.filter((query) => query.includes('"method":"lessThan"')).length).toBe(1);
  });
});
