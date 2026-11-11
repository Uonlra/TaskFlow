import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppwriteTaskRow } from "./schemas/task-row.schema";
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./env", () => ({ appwriteDatabaseId: "db", appwriteTasksTableId: "tasks", hasAppwriteDatabaseEnv: true }));
vi.mock("./request", () => ({
  appwriteFetch: mocks.fetch,
  AppwriteRequestError: class extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));
import { executeTaskEvolutionRemote, updateTaskStatus, deleteTask, updateTask } from "./tasks";
import { executeTaskEvolution } from "@/features/tasks/domain/task-evolution-storage";
import { AppwriteRequestError } from "./request";

let row: AppwriteTaskRow;
let txs: Map<string, { row?: AppwriteTaskRow; baseVersion?: number }>;
let remoteVersion: number;
let interfere: boolean;
let loseCommitResponse: boolean;
let skewFenceMetadata: boolean;
const start = {
  operationId: "branch",
  expectedRevision: 0,
  action: { type: "create_branch", title: "A", question: "是否有效？" },
};
beforeEach(() => {
  row = {
    $id: "t",
    $createdAt: "2026-11-01T00:00:00.000Z",
    $updatedAt: "2026-11-01T00:00:00.000Z",
    title: "知识库",
    description: "",
    status: "todo",
    priority: "medium",
  };
  txs = new Map();
  remoteVersion = 0;
  interfere = false;
  loseCommitResponse = false;
  skewFenceMetadata = false;
  mocks.fetch.mockReset().mockImplementation(async (call) => {
    if (call.path === "/tablesdb/transactions") {
      const id = `tx-${txs.size}`;
      txs.set(id, {});
      return { $id: id };
    }
    if (call.path.startsWith("/tablesdb/transactions/")) {
      const tx = txs.get(call.path.split("/").at(-1))!;
      if (call.body.rollback) return {};
      if (tx.baseVersion !== remoteVersion) throw new AppwriteRequestError(409, "concurrent write");
      row = tx.row!;
      remoteVersion++;
      if (loseCommitResponse) {
        loseCommitResponse = false;
        throw new Error("lost response after commit");
      }
      return {};
    }
    if (!call.body && !call.searchParams?.transactionId) return structuredClone(row);
    const tx = txs.get(call.body?.transactionId ?? call.searchParams?.transactionId)!;
    if (call.method === "PATCH") {
      if (!tx.row) {
        tx.row = structuredClone(row);
        tx.baseVersion = remoteVersion;
      }
      Object.assign(tx.row, call.body.data);
      if (skewFenceMetadata && call.body.data.evolutionFence) tx.row.$updatedAt = "2099-01-01T00:00:00.000Z";
      if (interfere && call.body.data.evolutionJson) {
        interfere = false;
        row = { ...row, description: "另一端修改" };
        remoteVersion++;
      }
    }
    return structuredClone(tx.row);
  });
});

describe("cloud evolution transactions", () => {
  it("does not mistake staged fence timestamps for a newer committed remote edit", async () => {
    const base = await executeTaskEvolutionRemote("session", "t", start);
    const incoming = executeTaskEvolution(
      base,
      { operationId: "note", expectedRevision: 1, action: { type: "record_progress", note: "离线进展" } },
      "2027-01-01T00:00:00.000Z",
    );
    skewFenceMetadata = true;
    const saved = await updateTask(
      "session",
      "t",
      {
        title: incoming.title,
        description: incoming.description,
        status: incoming.status,
        priority: incoming.priority,
        evolution: incoming.evolution,
      },
      undefined,
      "2027-01-01T00:00:00.000Z",
    );
    expect(saved.evolution?.revision).toBe(2);
  });
  it("checks newer metadata again inside the transaction instead of acknowledging unsaved history", async () => {
    const base = await executeTaskEvolutionRemote("session", "t", start);
    const incoming = executeTaskEvolution(
      base,
      { operationId: "note", expectedRevision: 1, action: { type: "record_progress", note: "离线进展" } },
      "2026-11-10T00:00:00.000Z",
    );
    row.$updatedAt = "2030-01-01T00:00:00.000Z";
    const previousHistory = row.evolutionJson;
    await expect(
      updateTask(
        "session",
        "t",
        {
          title: incoming.title,
          description: incoming.description,
          status: incoming.status,
          priority: incoming.priority,
          evolution: incoming.evolution,
        },
        undefined,
        "2026-11-10T00:00:00.000Z",
      ),
    ).rejects.toMatchObject({ code: "conflict" });
    expect(row.evolutionJson).toBe(previousHistory);
    expect(remoteVersion).toBe(1);
  });
  it("fences before reading and commits projection and history together", async () => {
    const saved = await executeTaskEvolutionRemote("session", "t", start);
    expect(saved.evolution?.revision).toBe(1);
    expect(JSON.parse(row.evolutionJson!).revision).toBe(1);
    const calls = mocks.fetch.mock.calls.map(([call]) => call);
    expect(calls[1].body.data).toEqual({ evolutionFence: true });
    expect(calls[2].searchParams).toBeUndefined();
    expect(calls.at(-1).body).toEqual({ commit: true });
    expect(calls.every((call) => call.sessionSecret === "session" && !call.useAdminKey)).toBe(true);
  });
  it("rolls back a concurrent write without losing the other writer's changes", async () => {
    interfere = true;
    await expect(executeTaskEvolutionRemote("session", "t", start)).rejects.toMatchObject({ status: 409 });
    expect(row.evolutionJson).toBeUndefined();
    expect(row.description).toBe("另一端修改");
    expect(mocks.fetch.mock.calls.at(-1)?.[0].body).toEqual({ rollback: true });
  });
  it("retries a lost commit response without duplicating the applied operation", async () => {
    loseCommitResponse = true;
    await expect(executeTaskEvolutionRemote("session", "t", start)).rejects.toThrow("lost response");
    const saved = await executeTaskEvolutionRemote("session", "t", start);
    expect(saved.evolution?.events).toHaveLength(2);
    expect(remoteVersion).toBe(1);
  });
  it("rejects old status endpoints and commands against deleted tasks", async () => {
    await executeTaskEvolutionRemote("session", "t", start);
    await expect(updateTaskStatus("session", "t", "done")).rejects.toThrow("验收");
    await deleteTask("session", "t");
    await expect(executeTaskEvolutionRemote("session", "t", { ...start, operationId: "later" })).rejects.toThrow(
      "已删除",
    );
    expect(row.evolutionJson).toBeTruthy();
  });
});
