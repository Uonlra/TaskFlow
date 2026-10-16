// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TaskListClient } from "@/features/tasks/components/task-list-client";
import { remoteTaskRepository } from "@/features/tasks/repositories/remote-task-repository";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { TaskFilters } from "@/features/tasks/types/task-filters";
import type { Task, TaskPageInitialData } from "@/features/tasks/types/task.types";
import { parseTaskImportPayload, PartialTaskImportError } from "@/features/tasks/utils/task-transfer";

const mocks = vi.hoisted(() => ({
  router: { push: vi.fn(), replace: vi.fn() },
  searchParams: new URLSearchParams(),
  auth: {
    user: { id: "user-1", email: "user@example.com", name: "User", emailVerified: true } as {
      id: string;
      email: string;
      name: string;
      emailVerified: boolean;
    } | null,
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
  importResult: null as unknown,
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
    page,
    onPageChange,
    onImportTasks,
    onExportTasks,
  }: {
    tasks: Task[];
    filters: TaskFilters;
    isLoading: boolean;
    onFiltersChange: (filters: TaskFilters) => void;
    page: number;
    onPageChange: (page: number) => void;
    onImportTasks: (tasks: TaskFormValues[]) => Promise<number>;
    onExportTasks: () => Promise<void>;
  }) => (
    <section aria-label="测试任务工作台" aria-busy={isLoading}>
      <span>当前页 {page}</span>
      {tasks.map((task) => (
        <span key={task.id}>{task.title}</span>
      ))}
      <button type="button" onClick={() => onFiltersChange({ ...filters, query: "first" })}>
        第一组筛选
      </button>
      <button type="button" onClick={() => onFiltersChange({ ...filters, query: "second" })}>
        第二组筛选
      </button>
      <button type="button" onClick={() => onPageChange(page + 1)}>
        下一页
      </button>
      <button type="button" onClick={() => void onExportTasks()}>
        模拟导出
      </button>
      <button
        type="button"
        onClick={() =>
          void onImportTasks([
            { title: "已导入", description: "", status: "todo", priority: "medium", tags: "", dueDate: "" },
            { title: "失败项", description: "", status: "todo", priority: "medium", tags: "", dueDate: "" },
            { title: "尚未处理", description: "", status: "todo", priority: "medium", tags: "", dueDate: "" },
          ]).then(
            (count) => {
              mocks.importResult = count;
            },
            (error) => {
              mocks.importResult = error;
            },
          )
        }
      >
        模拟导入
      </button>
    </section>
  ),
}));

const filters: TaskFilters = {
  query: "",
  tag: "",
  status: "active",
  priority: "all",
  due: "",
  risk: "",
  date: "",
  range: "",
  sort: "created_asc",
};

const initialData = buildPageData(task("initial", "初始任务"));

describe("TaskListClient loading flow", () => {
  beforeEach(() => {
    for (const key of [...mocks.searchParams.keys()]) mocks.searchParams.delete(key);
    vi.clearAllMocks();
    mocks.auth.user = { id: "user-1", email: "user@example.com", name: "User", emailVerified: true };
    mocks.store.tasks = [];
    mocks.store.createTaskAsync.mockReset().mockResolvedValue("task-created");
    mocks.importResult = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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

  it("桌面分页接入查询入口，切换筛选会直接请求第一页", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const page = Number(new URL(url, "http://localhost").searchParams.get("page"));
      return responseFor({ ...buildPagePayload(task("page", "分页结果")), page });
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<TaskListClient initialFilters={filters} initialData={initialData} />);
    await user.click(screen.getByRole("button", { name: "下一页" }));
    expect(await screen.findByText("当前页 2")).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toContain("page=2");
    await user.click(screen.getByRole("button", { name: "第一组筛选" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][0]).toContain("query=first&page=1");
    expect(screen.getByText("当前页 1")).toBeInTheDocument();
  });

  it("浏览器 URL 导航同步筛选和页码", async () => {
    const fetchMock = vi.fn().mockResolvedValue(responseFor({ ...buildPagePayload(task("nav", "导航结果")), page: 2 }));
    vi.stubGlobal("fetch", fetchMock);
    const { rerender } = render(<TaskListClient initialFilters={filters} initialData={initialData} />);
    mocks.searchParams.set("query", "导航");
    mocks.searchParams.set("page", "2");
    rerender(<TaskListClient initialFilters={filters} initialData={initialData} />);
    expect(await screen.findByText("导航结果")).toBeInTheDocument();
    expect(screen.getByText("当前页 2")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(new URL(fetchMock.mock.calls[0][0], "http://localhost").searchParams.get("query")).toBe("导航");
  });

  it.each(["guest", "account"] as const)("%s 导出的 JSON 可以直接重新导入", async (mode) => {
    const exported = task("exported", "可重新导入的任务");
    exported.tags = ["工作", "备份"];
    if (mode === "guest") {
      mocks.auth.user = null;
      mocks.store.tasks = [exported];
    }
    const remoteExport = vi.spyOn(remoteTaskRepository, "exportAll").mockResolvedValue([exported]);
    let downloaded: Blob | null = null;
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
      downloaded = blob as Blob;
      return "blob:task-export";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(<TaskListClient initialFilters={filters} initialData={mode === "guest" ? null : initialData} />);
    await user.click(screen.getByRole("button", { name: "模拟导出" }));
    expect(downloaded).not.toBeNull();
    const fileText = await readBlob(downloaded!);
    expect(parseTaskImportPayload(JSON.parse(fileText))).toEqual([
      {
        title: exported.title,
        description: exported.description,
        status: exported.status,
        priority: exported.priority,
        tags: "工作, 备份",
        dueDate: "",
      },
    ]);
    expect(remoteExport).toHaveBeenCalledTimes(mode === "account" ? 1 : 0);
  });

  it("批量导入中途失败时刷新已导入数据，并说明失败位置", async () => {
    mocks.store.createTaskAsync.mockResolvedValueOnce("created").mockRejectedValueOnce(new Error("写入失败"));
    const fetchMock = vi.fn().mockResolvedValue(responseFor(buildPagePayload(task("created", "已导入"))));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<TaskListClient initialFilters={filters} initialData={initialData} />);
    await user.click(screen.getByRole("button", { name: "模拟导入" }));
    await waitFor(() => expect(mocks.importResult).toBeInstanceOf(PartialTaskImportError));
    expect((mocks.importResult as Error).message).toContain("已导入 1/3 项；第 2 项“失败项”失败：写入失败");
    expect(await screen.findByText("已导入")).toBeInTheDocument();
    expect(mocks.store.createTaskAsync).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("首项导入失败时不报告部分成功，也不发起多余的刷新", async () => {
    mocks.store.createTaskAsync.mockRejectedValueOnce(new Error("写入失败"));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<TaskListClient initialFilters={filters} initialData={initialData} />);
    await user.click(screen.getByRole("button", { name: "模拟导入" }));
    await waitFor(() => expect(mocks.importResult).toBeInstanceOf(Error));
    expect(mocks.importResult).not.toBeInstanceOf(PartialTaskImportError);
    expect((mocks.importResult as Error).message).toBe("写入失败");
    expect(fetchMock).not.toHaveBeenCalled();
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

function readBlob(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}
