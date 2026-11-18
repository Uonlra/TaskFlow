import { beforeEach, describe, expect, it, vi } from "vitest";
import { branchTransferFixture } from "../../../../test/fixtures/task-branch-transfer";
const mocks = vi.hoisted(() => ({ requestJson: vi.fn(), getDesktopBridge: vi.fn() }));
vi.mock("@/shared/lib/api/client", () => ({ requestJson: mocks.requestJson }));
vi.mock("@/shared/lib/desktop/bridge", () => ({ getDesktopBridge: mocks.getDesktopBridge }));
import { refreshTaskSyncConflict, resolveTaskSyncConflict } from "./task-sync-conflicts";
const { task } = branchTransferFixture();
const conflict = {
  taskId: task.id,
  operationId: "local-operation",
  local: task,
  remote: task,
  detectedAt: task.createdAt,
};
const ids = { resolutionId: "resolution", copyTaskId: "copy" };
function setup() {
  const queue = {
    conflicts: vi.fn(),
    refreshConflict: vi.fn().mockResolvedValue(undefined),
    resolve: vi.fn().mockResolvedValue({ taskId: task.id, copyTaskId: "copy" }),
    resolution: vi.fn().mockResolvedValue(null),
  };
  mocks.getDesktopBridge.mockReturnValue({ syncQueue: queue });
  mocks.requestJson.mockResolvedValue({ task });
  return queue;
}
describe("conflict recovery", () => {
  beforeEach(() => vi.clearAllMocks());
  it("rechecks the cloud and passes the exact displayed local operation and cloud version", async () => {
    const queue = setup();
    await resolveTaskSyncConflict("account", conflict, ids, "keep_both");
    expect(queue.resolve).toHaveBeenCalledWith(
      expect.objectContaining({ expectedRemote: task, remote: task, operationId: "local-operation", ...ids }),
    );
  });
  it("a lost response is recovered from the durable receipt without duplicating the copy", async () => {
    const queue = setup();
    queue.resolve.mockRejectedValueOnce(new Error("response lost"));
    queue.resolution.mockResolvedValueOnce(null).mockResolvedValue({ taskId: task.id, copyTaskId: "copy" });
    await expect(resolveTaskSyncConflict("account", conflict, ids, "keep_both")).resolves.toEqual({
      taskId: task.id,
      copyTaskId: "copy",
    });
    await resolveTaskSyncConflict("account", conflict, ids, "keep_both");
    expect(queue.resolve).toHaveBeenCalledTimes(1);
    expect(mocks.requestJson).toHaveBeenCalledTimes(1);
  });
  it("a newer cloud version is retained for another review instead of applying the old choice", async () => {
    const queue = setup();
    const newer = { ...task, description: "更新的云端说明" };
    mocks.requestJson.mockResolvedValue({ task: newer });
    queue.resolve.mockRejectedValueOnce(new Error("云端版本已有变化"));
    await expect(resolveTaskSyncConflict("account", conflict, ids, "use_cloud", true)).rejects.toThrow("云端版本");
    expect(queue.refreshConflict).toHaveBeenCalledWith(expect.objectContaining({ remote: newer }));
  });
  it("offline or expired sessions leave all local changes intact", async () => {
    const queue = setup();
    mocks.requestJson.mockRejectedValueOnce(new Error("请先登录"));
    await expect(refreshTaskSyncConflict("account", conflict)).rejects.toThrow("请先登录");
    expect(queue.resolve).not.toHaveBeenCalled();
    expect(queue.refreshConflict).not.toHaveBeenCalled();
  });
});
