// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { TaskDetailClient } from "./task-detail-client";
import { useTaskStore } from "@/features/tasks/store/task-store";
import { executeTaskEvolution } from "@/features/tasks/domain/task-evolution-storage";
import type { Task } from "@/features/tasks/types/task.types";
const mocks = vi.hoisted(() => ({ get: vi.fn(), toast: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/features/auth/providers/auth-provider", () => ({
  useAuth: () => ({ user: { id: "owner" }, isConfigured: true, isLoading: false }),
}));
vi.mock("@/shared/providers/toast-provider", () => ({ useToast: () => ({ showToast: mocks.toast }) }));
vi.mock("@/features/tasks/repositories/task-repository-selector", () => ({
  getTaskRepository: () => ({ get: mocks.get }),
}));
const original = useTaskStore.getState();
const task: Task = {
  id: "t",
  title: "原目标",
  description: "",
  status: "todo",
  priority: "medium",
  tags: [],
  createdAt: "2026-11-10T00:00:00.000Z",
};
afterEach(() => {
  useTaskStore.setState(original, true);
  vi.clearAllMocks();
});

it("manual refresh invalidates a fetched task that was deleted in the cloud", async () => {
  mocks.get.mockResolvedValue(task);
  useTaskStore.setState({ tasks: [task], lastLoadedUserId: "owner", isLoading: false });
  render(<TaskDetailClient id="t" />);
  await screen.findByRole("heading", { level: 1, name: task.title });
  await act(async () => {
    await Promise.resolve();
  });
  mocks.get.mockResolvedValue(null);
  await act(async () => {
    useTaskStore.setState({ tasks: [] });
    window.dispatchEvent(new CustomEvent("taskflow:tasks-refreshed", { detail: { accountId: "owner" } }));
  });
  expect(await screen.findByRole("heading", { name: "没有找到这条任务" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { level: 1, name: task.title })).not.toBeInTheDocument();
});

it("conflict recovery replaces an older fetched local fork even when the cloud history has fewer events", async () => {
  const local = executeTaskEvolution(
    task,
    {
      operationId: "local-goal",
      expectedRevision: 0,
      action: { type: "adjust_goal", goal: { objective: "本地目标", successCriteria: "本地标准" }, reason: "本地" },
    },
    "2026-11-18T00:00:00.000Z",
  );
  const localLater = executeTaskEvolution(
    local,
    { operationId: "local-note", expectedRevision: 1, action: { type: "record_progress", note: "更多本地记录" } },
    "2026-11-18T00:01:00.000Z",
  );
  const remote = executeTaskEvolution(
    task,
    {
      operationId: "remote-goal",
      expectedRevision: 0,
      action: { type: "adjust_goal", goal: { objective: "云端目标", successCriteria: "云端标准" }, reason: "云端" },
    },
    "2026-11-18T00:02:00.000Z",
  );
  mocks.get.mockResolvedValue(localLater);
  useTaskStore.setState({ tasks: [localLater], lastLoadedUserId: "owner", isLoading: false });
  render(<TaskDetailClient id="t" />);
  await screen.findByRole("heading", { level: 1, name: "本地目标" });
  mocks.get.mockResolvedValue(remote);
  await act(async () => {
    useTaskStore.setState({ tasks: [remote] });
    window.dispatchEvent(
      new CustomEvent("taskflow:task-sync-resolved", { detail: { taskId: "t", accountId: "owner" } }),
    );
  });
  expect(await screen.findByRole("heading", { level: 1, name: "云端目标" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { level: 1, name: "本地目标" })).not.toBeInTheDocument();
});

it("a late detail read cannot replace a newly saved exploration", async () => {
  const user = userEvent.setup();
  let resolve!: (task: Task) => void;
  mocks.get.mockReturnValue(
    new Promise<Task>((done) => {
      resolve = done;
    }),
  );
  useTaskStore.setState({
    tasks: [task],
    lastLoadedUserId: "owner",
    isLoading: false,
    executeEvolution: async (_id, command) => executeTaskEvolution(task, command, "2026-11-10T01:00:00.000Z"),
  });
  render(<TaskDetailClient id="t" />);
  await user.click(screen.getByRole("button", { name: "创建探索分支" }));
  await user.type(screen.getByRole("textbox", { name: "方案名称" }), "新方案");
  await user.type(screen.getByRole("textbox", { name: "验证问题" }), "能否改善检索？");
  await user.click(screen.getByRole("button", { name: "保存记录" }));
  expect(screen.getByRole("heading", { name: "新方案" })).toBeInTheDocument();
  await act(async () => resolve(task));
  expect(screen.getByRole("heading", { name: "新方案" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "演进记录" })).toBeInTheDocument();
});

it("a saved goal updates both the fetched detail and the heading immediately", async () => {
  const user = userEvent.setup();
  mocks.get.mockResolvedValue(task);
  useTaskStore.setState({
    tasks: [task],
    lastLoadedUserId: "owner",
    isLoading: false,
    executeEvolution: async (_id, command) => executeTaskEvolution(task, command, "2026-11-10T01:00:00.000Z"),
  });
  render(<TaskDetailClient id="t" />);
  await user.click(screen.getByRole("button", { name: "调整目标" }));
  await user.clear(screen.getByRole("textbox", { name: "保存后的目标" }));
  await user.type(screen.getByRole("textbox", { name: "保存后的目标" }), "新的主目标");
  await user.type(screen.getByRole("textbox", { name: "操作原因" }), "收敛范围");
  await user.click(screen.getByRole("button", { name: "保存记录" }));
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("新的主目标");
  expect(screen.queryByRole("button", { name: "切换状态" })).not.toBeInTheDocument();
});
