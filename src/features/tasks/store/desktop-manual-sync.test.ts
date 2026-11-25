// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { TaskflowDesktopBridge } from "@/shared/lib/desktop/bridge";
import { useTaskStore } from "./task-store";

const cloud = vi.hoisted(() => ({ flush: vi.fn(), pull: vi.fn() }));
vi.mock("@/shared/lib/appwrite/env", () => ({ hasAppwritePublicEnv: true }));
vi.mock("../sync/desktop-sync", () => ({ flushDesktopSyncQueue: cloud.flush, pullDesktopSyncRecords: cloud.pull }));

const task = {
  id: "local-1",
  title: "本地任务",
  description: "",
  status: "todo" as const,
  priority: "medium" as const,
  tags: [],
  createdAt: "2026-11-25T00:00:00Z",
};
const remote = { ...task, title: "云端任务" };
const workspace = vi.fn();
const auth = vi.fn();
const upsert = vi.fn();
beforeEach(() => {
  vi.resetAllMocks();
  workspace.mockResolvedValue({ accountId: "user-1", syncEnabled: true });
  auth.mockResolvedValue({ user: { id: "user-1" } });
  cloud.flush.mockResolvedValue({ processed: 0, failed: 0 });
  cloud.pull.mockResolvedValue([remote]);
  upsert.mockResolvedValue([remote]);
  window.taskflowDesktop = {
    isDesktop: true,
    workspace: { get: workspace },
    auth: { get: auth },
    localTasks: { list: vi.fn().mockResolvedValue([task]), upsert },
  } as unknown as TaskflowDesktopBridge;
  useTaskStore.setState({
    tasks: [task],
    error: null,
    lastLoadedUserId: null,
    isLoading: false,
    isCloudSyncing: false,
  });
});
afterEach(() => {
  delete window.taskflowDesktop;
});

it("即使已连接云端，加载和刷新桌面任务也只读取本地", async () => {
  await useTaskStore.getState().syncTasks("user-1");
  await useTaskStore.getState().syncTasks("user-1");
  expect(cloud.flush).not.toHaveBeenCalled();
  expect(cloud.pull).not.toHaveBeenCalled();
  expect(useTaskStore.getState().tasks).toEqual([task]);
});

it("只有手动更新才上传和拉取，连续点击复用同一次同步", async () => {
  await Promise.all([
    useTaskStore.getState().syncCloudTasks("user-1"),
    useTaskStore.getState().syncCloudTasks("user-1"),
  ]);
  expect(cloud.flush).toHaveBeenCalledTimes(1);
  expect(cloud.pull).toHaveBeenCalledTimes(1);
  expect(upsert).toHaveBeenCalledWith({ accountId: "user-1", tasks: [remote] });
  expect(useTaskStore.getState().isCloudSyncing).toBe(false);
});

it("手动操作分批上传积压任务，直到队列清空后才拉取", async () => {
  cloud.flush.mockResolvedValueOnce({ processed: 50, failed: 0 }).mockResolvedValueOnce({ processed: 2, failed: 0 });
  await useTaskStore.getState().syncCloudTasks("user-1");
  expect(cloud.flush).toHaveBeenCalledTimes(3);
  expect(cloud.pull).toHaveBeenCalledTimes(1);
});

it("同步失败保留本地记录，结束忙碌状态并等待用户重试", async () => {
  cloud.pull.mockRejectedValue(new Error("云端暂停"));
  await expect(useTaskStore.getState().syncCloudTasks("user-1")).rejects.toThrow("云端暂停");
  expect(upsert).not.toHaveBeenCalled();
  expect(useTaskStore.getState().tasks).toEqual([task]);
  expect(useTaskStore.getState().isCloudSyncing).toBe(false);
  expect(cloud.pull).toHaveBeenCalledTimes(1);
});

it("断开连接时拒绝同步，不发起云端请求", async () => {
  workspace.mockResolvedValue({ accountId: "user-1", syncEnabled: false });
  await expect(useTaskStore.getState().syncCloudTasks("user-1")).rejects.toThrow("连接已关闭");
  expect(cloud.flush).not.toHaveBeenCalled();
  expect(cloud.pull).not.toHaveBeenCalled();
});

it("等待云端响应期间退出账户，不导入响应或覆盖本地内容", async () => {
  cloud.pull.mockImplementation(async () => {
    auth.mockResolvedValue(null);
    return [remote];
  });
  await expect(useTaskStore.getState().syncCloudTasks("user-1")).rejects.toThrow("账户已切换");
  expect(upsert).not.toHaveBeenCalled();
  expect(useTaskStore.getState().tasks).toEqual([task]);
});

it("部分上传失败明确反馈，不循环重试失败的批次", async () => {
  cloud.flush.mockResolvedValue({ processed: 3, failed: 1 });
  await expect(useTaskStore.getState().syncCloudTasks("user-1")).rejects.toThrow("1 项上传失败");
  expect(cloud.flush).toHaveBeenCalledTimes(1);
  expect(cloud.pull).toHaveBeenCalledTimes(1);
});

it("持续出现新编辑时限制本轮上传，提示用户再次同步", async () => {
  let attempts = 0;
  cloud.flush.mockImplementation(async () => {
    if (++attempts > 25) throw new Error("测试安全上限");
    return { processed: 1, failed: 0 };
  });
  window.taskflowDesktop!.syncQueue = {
    list: vi.fn().mockResolvedValue([{}]),
  } as unknown as TaskflowDesktopBridge["syncQueue"];
  await expect(useTaskStore.getState().syncCloudTasks("user-1")).rejects.toThrow("仍有待上传内容");
  expect(attempts).toBeLessThanOrEqual(20);
  expect(cloud.pull).toHaveBeenCalledTimes(1);
  expect(useTaskStore.getState().isCloudSyncing).toBe(false);
});
