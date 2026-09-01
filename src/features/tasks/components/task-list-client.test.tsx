// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TaskListClient } from "@/features/tasks/components/task-list-client";
import type { TaskFilters } from "@/features/tasks/types/task-filters";
import type { Task, TaskPageInitialData } from "@/features/tasks/types/task.types";

const mocks = vi.hoisted(() => ({
  router: { push: vi.fn(), replace: vi.fn() },
  searchParams: new URLSearchParams(),
  auth: {
    user: { id: "user-1", email: "user@example.com", name: "User", emailVerified: true },
    isConfigured: true,
    isLoading: false,
  },
  store: {
    tasks: [] as Task[],
    createTaskAsync: vi.fn(async () => "task-created"),
    updateTask: vi.fn(async () => undefined),
    updateTaskStatus: vi.fn(async () => undefined),
    deleteTask: vi.fn(async () => undefined),
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/tasks",
  useRouter: () => mocks.router,
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("@/features/auth/providers/auth-provider", () => ({
  useAuth: () => mocks.auth,
}));

vi.mock("@/shared/providers/toast-provider", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("@/features/tasks/store/task-store", () => ({
  useTaskStore: (selector: (state: typeof mocks.store) => unknown) => selector(mocks.store),
}));

vi.mock("@/features/tasks/components/mobile-task-list-view", () => ({
  MobileTaskListView: () => null,
}));

vi.mock("@/features/tasks/components/desktop-task-workbench", () => ({
  DesktopTaskWorkbench: ({
    tasks,
    filters,
    isLoading,
    onFiltersChange,
  }: {
    tasks: Task[];
    filters: TaskFilters;
    isLoading: boolean;
    onFiltersChange: (filters: TaskFilters) => void;
  }) => (
    <section aria-label="测试任务工作台" aria-busy={isLoading}>
      {tasks.map((task) => (
        <span key={task.id}>{task.title}</span>
      ))}
      <button type="button" onClick={() => onFiltersChange({ ...filters, query: "first" })}>
        第一组筛选
      </button>
      <button type="button" onClick={() => onFiltersChange({ ...filters, query: "second" })}>
        第二组筛选
      </button>
    </section>
  ),
}));

const filters: TaskFilters = {
  query: "",
  tag: "",
  status: "all",
  priority: "all",
  due: "",
  risk: "",
  date: "",
  range: "",
  sort: "due_asc",
};

const initialData = buildPageData(task("initial", "初始任务"));

describe("TaskListClient loading flow", () => {
  beforeEach(() => {
    mocks.searchParams.forEach((_, key) => mocks.searchParams.delete(key));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("复用匹配的服务端初始数据，不发起重复请求", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<TaskListClient initialFilters={filters} initialData={initialData} />);

    expect(await screen.findByText("初始任务")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
  });

  it("服务端用户数据不匹配时隐藏旧数据，并重新加载当前用户任务", async () => {
    const fetchMock = vi.fn().mockResolvedValue(responseFor(buildPagePayload(task("current", "当前用户任务"))));
    vi.stubGlobal("fetch", fetchMock);

    render(<TaskListClient initialFilters={filters} initialData={{ ...initialData, userId: "server-user" }} />);

    expect(screen.queryByText("初始任务")).not.toBeInTheDocument();
    expect(await screen.findByText("当前用户任务")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("快速切换筛选时只接受最新请求的结果", async () => {
    const firstRequest = deferred<Response>();
    const secondRequest = deferred<Response>();
    const fetchMock = vi.fn().mockReturnValueOnce(firstRequest.promise).mockReturnValueOnce(secondRequest.promise);
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<TaskListClient initialFilters={filters} initialData={initialData} />);
    await user.click(screen.getByRole("button", { name: "第一组筛选" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: "第二组筛选" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    expect(fetchMock.mock.calls[0][1]?.signal).toHaveProperty("aborted", true);
    secondRequest.resolve(responseFor(buildPagePayload(task("new", "最新结果"))));
    expect(await screen.findByText("最新结果")).toBeInTheDocument();

    firstRequest.resolve(responseFor(buildPagePayload(task("old", "过期结果"))));
    await waitFor(() => expect(screen.queryByText("过期结果")).not.toBeInTheDocument());
  });

  it("首次加载失败时显示错误状态，并允许重试", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(responseFor({ message: "服务暂时不可用" }, false))
      .mockResolvedValueOnce(responseFor(buildPagePayload(task("retry", "重试后的任务"))));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<TaskListClient initialFilters={filters} initialData={null} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("服务暂时不可用");
    await user.click(screen.getByRole("button", { name: "重新加载" }));

    expect(await screen.findByText("重试后的任务")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

function task(id: string, title: string): Task {
  return {
    id,
    title,
    description: "",
    status: "todo",
    priority: "medium",
    tags: [],
    createdAt: "2026-09-01T08:00:00.000Z",
  };
}

function buildPageData(item: Task): TaskPageInitialData {
  return { userId: "user-1", ...buildPagePayload(item) };
}

function buildPagePayload(item: Task): Omit<TaskPageInitialData, "userId"> {
  return {
    tasks: [item],
    total: 1,
    page: 1,
    pageSize: 50,
    hasNext: false,
    categoryCounts: { near: 0, active: 1, done: 0, all: 1 },
  };
}

function responseFor(payload: unknown, ok = true) {
  return { ok, json: async () => payload } as Response;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}
