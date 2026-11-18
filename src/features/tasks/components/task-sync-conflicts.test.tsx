// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { branchTransferFixture } from "../../../../test/fixtures/task-branch-transfer";
import { executeTaskEvolution } from "../domain/task-evolution-storage";

const mocks = vi.hoisted(() => ({
  bridge: vi.fn(),
  refresh: vi.fn(),
  resolve: vi.fn(),
  sync: vi.fn(),
  toast: vi.fn(),
  desktop: vi.fn(),
}));
vi.mock("@/shared/lib/desktop/bridge", () => ({ getDesktopBridge: mocks.bridge }));
vi.mock("@/shared/hooks/use-desktop-runtime", () => ({ useDesktopRuntime: mocks.desktop }));
vi.mock("@/shared/providers/toast-provider", () => ({ useToast: () => ({ showToast: mocks.toast }) }));
vi.mock("../sync/task-sync-conflicts", () => ({
  refreshTaskSyncConflict: mocks.refresh,
  resolveTaskSyncConflict: mocks.resolve,
}));
vi.mock("../store/task-store", () => {
  const tasks: unknown[] = [];
  const state = { tasks, syncTasks: mocks.sync };
  return {
    useTaskStore: Object.assign((selector: (state: unknown) => unknown) => selector(state), { getState: () => state }),
  };
});
import { TaskSyncConflicts } from "./task-sync-conflicts";
const { task } = branchTransferFixture();
const conflict = {
  taskId: task.id,
  operationId: "pending",
  local: task,
  remote: { ...task, description: "云端说明" },
  detectedAt: task.createdAt,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.desktop.mockReturnValue(true);
  mocks.bridge.mockReturnValue({
    workspace: { get: vi.fn().mockResolvedValue({ accountId: "account" }) },
    syncQueue: { conflicts: vi.fn().mockResolvedValue([conflict]) },
  });
  mocks.refresh.mockResolvedValue(undefined);
  mocks.resolve.mockResolvedValue({ taskId: task.id, copyTaskId: "copy" });
  mocks.sync.mockResolvedValue(undefined);
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
describe("compact sync conflict entry", () => {
  it("can inspect every new record before choosing a version", async () => {
    let local = task;
    for (let n = 1; n <= 7; n++)
      local = executeTaskEvolution(
        local,
        {
          operationId: `note-${n}`,
          expectedRevision: local.evolution!.revision,
          action: { type: "record_progress", note: `离线进展 ${n}` },
        },
        "2026-11-18T00:00:00.000Z",
      );
    mocks.bridge().syncQueue.conflicts.mockResolvedValue([{ ...conflict, local }]);
    const user = userEvent.setup();
    render(<TaskSyncConflicts />);
    await user.click(await screen.findByRole("button", { name: /同步待处理/ }));
    expect(screen.queryByText("离线进展 1")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "查看本地全部 7 条新增记录" }));
    expect(screen.getByText("离线进展 1")).toBeInTheDocument();
  });
  it("stays hidden without conflicts and outside the desktop runtime", async () => {
    mocks.desktop.mockReturnValue(false);
    render(<TaskSyncConflicts />);
    expect(screen.queryByRole("button", { name: /同步待处理/ })).not.toBeInTheDocument();
    expect(mocks.bridge).not.toHaveBeenCalled();
  });
  it("shows both versions and keeps the same recovery identifiers after a failed save", async () => {
    const user = userEvent.setup();
    mocks.resolve.mockRejectedValueOnce(new Error("保存失败"));
    render(<TaskSyncConflicts />);
    await user.click(await screen.findByRole("button", { name: /同步待处理/ }));
    expect(await screen.findByRole("region", { name: "本地版本" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "云端版本" })).toHaveTextContent("云端说明");
    const keep = await screen.findByRole("button", { name: "保留本地副本并恢复同步" });
    await waitFor(() => expect(keep).toBeEnabled());
    await user.click(keep);
    expect(await screen.findByRole("alert")).toHaveTextContent("保存失败");
    await user.click(screen.getByRole("button", { name: "重新读取" }));
    await waitFor(() => expect(keep).toBeEnabled());
    await user.click(keep);
    await waitFor(() => expect(mocks.resolve).toHaveBeenCalledTimes(2));
    expect(mocks.resolve.mock.calls[1][2]).toEqual(mocks.resolve.mock.calls[0][2]);
    expect(mocks.sync).toHaveBeenCalledWith("account");
  });
  it("requires a second explicit confirmation to replace local changes", async () => {
    const user = userEvent.setup();
    render(<TaskSyncConflicts />);
    await user.click(await screen.findByRole("button", { name: /同步待处理/ }));
    const cloud = screen.getByRole("button", { name: "采用云端版本" });
    await waitFor(() => expect(cloud).toBeEnabled());
    await user.click(cloud);
    expect(mocks.resolve).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "确认采用云端版本" }));
    await waitFor(() =>
      expect(mocks.resolve).toHaveBeenCalledWith("account", conflict, expect.any(Object), "use_cloud", true),
    );
  });
  it("a failed cloud read cannot discard or copy an unreviewed version", async () => {
    const user = userEvent.setup();
    mocks.refresh.mockRejectedValue(new Error("登录已失效"));
    render(<TaskSyncConflicts />);
    await user.click(await screen.findByRole("button", { name: /同步待处理/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("登录已失效");
    expect(screen.getByRole("button", { name: "采用云端版本" })).toBeDisabled();
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
});
