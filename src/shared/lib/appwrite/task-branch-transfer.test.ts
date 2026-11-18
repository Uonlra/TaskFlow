import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppwriteTaskRow } from "./schemas/task-row.schema";
import { branchTransferFixture, transferredTaskId } from "../../../../test/fixtures/task-branch-transfer";
import { transferTaskBranch } from "@/features/tasks/domain/task-evolution-storage";
import type { Task } from "@/features/tasks/types/task.types";
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
import { createTask, transferTaskBranchRemote, updateTask } from "./tasks";
import { AppwriteRequestError } from "./request";

let rows: Map<string, AppwriteTaskRow>;
let versions: Map<string, number>;
let transactions: Map<string, { staged: Map<string, AppwriteTaskRow>; bases: Map<string, number> }>;
let failCreate: boolean;
let conflictCommit: boolean;
let lostResponse: boolean;
const { task: source, command } = branchTransferFixture();
const now = source.createdAt;

function row(task: Task): AppwriteTaskRow {
  return {
    $id: task.id,
    $createdAt: task.createdAt,
    $updatedAt: task.updatedAt ?? task.createdAt,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    tags: task.tags,
    evolutionJson: JSON.stringify(task.evolution),
  };
}

beforeEach(() => {
  rows = new Map([[source.id, row(source)]]);
  versions = new Map([[source.id, 1]]);
  transactions = new Map();
  failCreate = conflictCommit = lostResponse = false;
  mocks.fetch.mockReset().mockImplementation(async (call) => {
    if (call.path === "/tablesdb/transactions") {
      const id = `tx-${transactions.size}`;
      transactions.set(id, { staged: new Map(), bases: new Map() });
      return { $id: id };
    }
    if (call.path.startsWith("/tablesdb/transactions/")) {
      const tx = transactions.get(call.path.split("/").at(-1))!;
      if (call.body.rollback) return {};
      if (conflictCommit) throw new AppwriteRequestError(409, "concurrent source write");
      for (const [id, base] of tx.bases)
        if ((versions.get(id) ?? 0) !== base) throw new AppwriteRequestError(409, "conflict");
      for (const [id, staged] of tx.staged) {
        rows.set(id, structuredClone(staged));
        versions.set(id, (versions.get(id) ?? 0) + 1);
      }
      if (lostResponse) {
        lostResponse = false;
        throw new Error("lost commit response");
      }
      return {};
    }
    const id = call.body?.rowId ?? call.path.split("/").at(-1);
    if (!call.method || call.method === "GET") {
      if (!rows.has(id)) throw new AppwriteRequestError(404, "not found");
      return structuredClone(rows.get(id));
    }
    const tx = transactions.get(call.body.transactionId);
    if (call.method === "POST") {
      if (failCreate) throw new Error("target creation failed");
      if (rows.has(id) || tx?.staged.has(id)) throw new AppwriteRequestError(409, "target collision");
      const created = { $id: id, $createdAt: now, $updatedAt: now, ...call.body.data };
      if (tx) {
        tx.bases.set(id, versions.get(id) ?? 0);
        tx.staged.set(id, created);
      } else {
        rows.set(id, created);
        versions.set(id, 1);
      }
      return structuredClone(created);
    }
    if (!tx || !rows.has(id)) throw new AppwriteRequestError(404, "not found");
    tx.bases.set(id, versions.get(id) ?? 0);
    const staged = { ...(tx.staged.get(id) ?? rows.get(id)!), ...call.body.data };
    tx.staged.set(id, staged);
    return structuredClone(staged);
  });
});

describe("cloud branch transfer transaction", () => {
  it("commits the source event and new task together using only the authenticated session and row permissions", async () => {
    const result = await transferTaskBranchRemote("session", "user", source.id, command);
    expect(rows.size).toBe(2);
    expect(result.source.evolution?.branches[0].transferredTaskId).toBe(transferredTaskId);
    expect(JSON.parse(rows.get(transferredTaskId)!.evolutionJson!).origin.taskId).toBe(source.id);
    const create = mocks.fetch.mock.calls
      .map(([call]) => call)
      .find((call) => call.method === "POST" && call.body?.rowId === transferredTaskId);
    expect(create.body.permissions).toEqual(['read("user:user")', 'update("user:user")', 'delete("user:user")']);
    expect(create.body.transactionId).toBeTruthy();
    expect(mocks.fetch.mock.calls.every(([call]) => call.sessionSecret === "session" && !call.useAdminKey)).toBe(true);
  });

  it.each(["creation", "conflict"])("rolls back both records on %s failure", async (failure) => {
    if (failure === "creation") failCreate = true;
    else conflictCommit = true;
    const original = structuredClone(rows.get(source.id));
    await expect(transferTaskBranchRemote("session", "user", source.id, command)).rejects.toThrow();
    expect(rows.get(source.id)).toEqual(original);
    expect(rows.has(transferredTaskId)).toBe(false);
  });

  it("rejects occupied target identities without marking the source as transferred", async () => {
    rows.set(transferredTaskId, { ...row(source), $id: transferredTaskId, title: "其他任务" });
    await expect(transferTaskBranchRemote("session", "user", source.id, command)).rejects.toThrow("collision");
    expect(JSON.parse(rows.get(source.id)!.evolutionJson!).branches[0].transferredTaskId).toBeUndefined();
    expect(rows.get(transferredTaskId)!.title).toBe("其他任务");
  });

  it("retries a lost commit response without another creation and never resurrects a deleted target", async () => {
    lostResponse = true;
    await expect(transferTaskBranchRemote("session", "user", source.id, command)).rejects.toThrow("lost");
    const retried = await transferTaskBranchRemote("session", "user", source.id, command);
    expect(retried.task?.id).toBe(transferredTaskId);
    expect(rows.size).toBe(2);
    expect(retried.source.evolution!.events.filter((event) => event.kind === "transfer_branch")).toHaveLength(1);
    rows.get(transferredTaskId)!.deletedAt = now;
    expect((await transferTaskBranchRemote("session", "user", source.id, command)).task).toBeNull();
    expect(rows.get(transferredTaskId)!.deletedAt).toBe(now);
  });

  it("materializes an offline transfer's initial target in the same transaction as the source snapshot", async () => {
    const result = transferTaskBranch(source, command, now);
    const data = { ...result.source, tags: "", dueDate: "" };
    await updateTask("session", source.id, data, undefined, "2026-11-19T00:00:00.000Z", "user");
    expect(rows.has(transferredTaskId)).toBe(true);
    const targetCreate = mocks.fetch.mock.calls
      .map(([call]) => call)
      .find((call) => call.body?.rowId === transferredTaskId);
    const sourceWrite = mocks.fetch.mock.calls
      .map(([call]) => call)
      .find((call) => call.method === "PATCH" && call.body?.data?.evolutionJson);
    expect(targetCreate.body.transactionId).toBe(sourceWrite.body.transactionId);
  });

  it("creates an offline-new source and its target atomically, and refuses a target whose source has not synced", async () => {
    rows.clear();
    versions.clear();
    const result = transferTaskBranch(source, command, now);
    const target = result.task!;
    await expect(createTask("session", "user", { ...target, tags: "" }, undefined, target.id, now)).rejects.toThrow();
    expect(rows.size).toBe(0);
    await createTask("session", "user", { ...result.source, tags: "" }, undefined, source.id, now);
    expect(rows.size).toBe(2);
  });

  it("cannot attach an incoming target snapshot to an unrelated existing row when the source transfer failed", async () => {
    const result = transferTaskBranch(source, command, now);
    rows.set(transferredTaskId, {
      ...row(source),
      $id: transferredTaskId,
      title: "其他任务",
      evolutionJson: undefined,
    });
    await expect(
      updateTask(
        "session",
        transferredTaskId,
        { ...result.task!, tags: "" },
        undefined,
        "2026-11-19T00:00:00.000Z",
        "user",
      ),
    ).rejects.toThrow("转出记录");
    expect(rows.get(transferredTaskId)!.title).toBe("其他任务");
    expect(rows.get(transferredTaskId)!.evolutionJson).toBeUndefined();
  });
});
