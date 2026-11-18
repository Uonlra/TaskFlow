import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ bridge: vi.fn(), get: vi.fn(), request: vi.fn(), sync: vi.fn(), store: vi.fn() }));
vi.mock("@/shared/lib/desktop/bridge", () => ({ getDesktopBridge: mocks.bridge }));
vi.mock("../repositories/task-repository-selector", () => ({ getTaskRepository: () => ({ get: mocks.get }) }));
vi.mock("../store/task-store", () => ({ useTaskStore: { getState: mocks.store } }));
vi.mock("@/shared/lib/api/client", () => ({ requestJson: mocks.request }));
import { loadRelatedTask } from "./load-related-task";
const signal = () => new AbortController().signal;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.bridge.mockReturnValue(null);
  mocks.store.mockReturnValue({ tasks: [{ id: "target" }], lastLoadedUserId: null, syncTasks: mocks.sync });
});
it("uses guest storage without an authenticated request", async () => {
  expect(await loadRelatedTask("target", undefined, signal())).toEqual({ id: "target" });
  expect(mocks.get).not.toHaveBeenCalled();
  expect(mocks.request).not.toHaveBeenCalled();
});
it("can download an existing linked task when this device has not received it yet", async () => {
  const remote = { id: "target" };
  const bridge = {
    workspace: { get: vi.fn().mockResolvedValue({ accountId: "account", syncEnabled: true }) },
    localTasks: { upsert: vi.fn().mockResolvedValue([]) },
  };
  mocks.bridge.mockReturnValue(bridge);
  mocks.get.mockResolvedValueOnce(null).mockResolvedValueOnce(remote);
  mocks.request.mockResolvedValue({ task: remote });
  expect(await loadRelatedTask("target", "account", signal())).toEqual(remote);
  expect(bridge.localTasks.upsert).toHaveBeenCalledWith({ accountId: "account", tasks: [remote] });
  expect(mocks.sync).toHaveBeenCalledWith("account");
});
it("does not turn on a paused workspace or import a cloud tombstone", async () => {
  const bridge = {
    workspace: { get: vi.fn().mockResolvedValue({ accountId: "account", syncEnabled: false }) },
    localTasks: { upsert: vi.fn() },
  };
  mocks.bridge.mockReturnValue(bridge);
  mocks.get.mockResolvedValue(null);
  expect(await loadRelatedTask("target", "account", signal())).toBeNull();
  expect(mocks.request).not.toHaveBeenCalled();
  bridge.workspace.get.mockResolvedValue({ accountId: "account", syncEnabled: true });
  mocks.request.mockResolvedValue({ task: { id: "target", deletedAt: "2026-11-18T00:00:00.000Z" } });
  expect(await loadRelatedTask("target", "account", signal())).toBeNull();
  expect(bridge.localTasks.upsert).not.toHaveBeenCalled();
});
