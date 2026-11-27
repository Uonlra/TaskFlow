// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DesktopTaskWorkbench } from "@/features/tasks/components/desktop-task-workbench";
import type { TaskFilters } from "@/features/tasks/types/task-filters";
import type { Task } from "@/features/tasks/types/task.types";
import { createTaskExportPayload, PartialTaskImportError } from "@/features/tasks/utils/task-transfer";
import { ToastProvider } from "@/shared/providers/toast-provider";
import { graphFixture } from "../../../../test/fixtures/task-evolution";

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockTaskDetailPanel({
      task,
      initiallyOpenRelations = false,
    }: {
      task: Task | null;
      initiallyOpenRelations?: boolean;
    }) {
      return task ? (
        <aside data-relations-open={initiallyOpenRelations}>
          <h2>{task.title}</h2>
        </aside>
      ) : null;
    },
}));

const tasks: Task[] = [
  {
    id: "task-1",
    title: "第一项任务",
    description: "第一项说明",
    status: "todo",
    priority: "high",
    tags: [],
    dueDate: "2026-08-20",
    createdAt: "2026-08-17T08:00:00.000Z",
  },
  {
    id: "task-2",
    title: "第二项任务",
    description: "第二项说明",
    status: "in_progress",
    priority: "medium",
    tags: ["键盘"],
    dueDate: "2026-08-21",
    createdAt: "2026-08-17T09:00:00.000Z",
  },
];

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

describe("DesktopTaskWorkbench keyboard path", () => {
  it("opens the requested task's relations and resets the target on a normal row selection", async () => {
    const user = userEvent.setup();
    const state = graphFixture();
    const evolved = { ...tasks[1], id: state.taskId, title: state.goal.objective, evolution: state };
    render(
      <ToastProvider>
        <DesktopTaskWorkbench
          tasks={[tasks[0], evolved]}
          filters={filters}
          isLoading={false}
          onFiltersChange={vi.fn()}
          onResetFilters={vi.fn()}
          onCreateTask={vi.fn()}
          onImportTasks={vi.fn(async () => 0)}
          onUpdateTask={vi.fn()}
          onUpdateStatus={vi.fn()}
          onDeleteTask={vi.fn()}
        />
      </ToastProvider>,
    );
    // The detail panel intentionally waits for idle; busy parallel workers can exceed the default 1s query timeout.
    expect(await screen.findByRole("heading", { name: tasks[0].title }, { timeout: 3000 })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: `查看「${evolved.title}」的探索关系` }));
    expect(screen.getByRole("complementary")).toHaveAttribute("data-relations-open", "true");
    expect(screen.getByRole("heading", { name: evolved.title })).toBeInTheDocument();
    await user.click(screen.getAllByRole("row")[1]);
    expect(screen.getByRole("complementary")).toHaveAttribute("data-relations-open", "false");
    expect(screen.getByRole("heading", { name: tasks[0].title })).toBeInTheDocument();
  });

  it("批量导入部分成功时显示已完成数量和失败位置", async () => {
    const user = userEvent.setup();
    const onImportTasks = vi
      .fn()
      .mockRejectedValue(new PartialTaskImportError(1, 2, "第二项任务", new Error("写入失败")));
    render(
      <ToastProvider>
        <DesktopTaskWorkbench
          tasks={tasks}
          totalTasks={tasks}
          filters={filters}
          isLoading={false}
          onFiltersChange={vi.fn()}
          onResetFilters={vi.fn()}
          onCreateTask={vi.fn()}
          onImportTasks={onImportTasks}
          onUpdateTask={vi.fn()}
          onUpdateStatus={vi.fn()}
          onDeleteTask={vi.fn()}
        />
      </ToastProvider>,
    );

    const fileContent = JSON.stringify(createTaskExportPayload(tasks));
    const file = new File([fileContent], "tasks.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: async () => fileContent });
    await user.upload(document.querySelector(".desktop-task-import-input") as HTMLInputElement, file);
    expect(await screen.findByText("部分导入")).toBeInTheDocument();
    expect(screen.getByText(/已导入 1\/2 项；第 2 项“第二项任务”失败/)).toBeInTheDocument();
    expect(onImportTasks).toHaveBeenCalledWith(createTaskExportPayload(tasks).tasks);
  });

  it("将任务上下文、搜索和筛选合并到共享顶部工具栏", async () => {
    render(
      <ToastProvider>
        <DesktopTaskWorkbench
          tasks={tasks}
          totalTasks={tasks}
          filters={filters}
          isLoading={false}
          onFiltersChange={vi.fn()}
          onResetFilters={vi.fn()}
          onCreateTask={vi.fn()}
          onImportTasks={vi.fn(async () => 0)}
          onUpdateTask={vi.fn()}
          onUpdateStatus={vi.fn()}
          onDeleteTask={vi.fn()}
        />
      </ToastProvider>,
    );

    const toolbar = screen.getByRole("banner", { name: "任务" });
    expect(screen.getByRole("heading", { name: "任务", level: 1 })).toHaveClass("visually-hidden");
    expect(screen.queryByText("共 2 项任务")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "搜索任务、标签" })).toBeInTheDocument();
    expect(toolbar).toContainElement(screen.getByRole("button", { name: "新建任务" }));
  });

  it("切换分类时应用各分类对应的状态和排序", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    render(
      <ToastProvider>
        <DesktopTaskWorkbench
          tasks={tasks}
          totalTasks={tasks}
          filters={filters}
          isLoading={false}
          onFiltersChange={onFiltersChange}
          onResetFilters={vi.fn()}
          onCreateTask={vi.fn()}
          onImportTasks={vi.fn(async () => 0)}
          onUpdateTask={vi.fn()}
          onUpdateStatus={vi.fn()}
          onDeleteTask={vi.fn()}
        />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: /未完成/ }));
    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "active", due: "", sort: "created_asc" }),
    );

    await user.click(screen.getByRole("button", { name: /近期/ }));
    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "active", due: "near", sort: "due_asc" }),
    );

    await user.click(screen.getByRole("button", { name: /全部/ }));
    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "all", due: "", sort: "created_asc" }),
    );
  });

  it("通过键盘激活任务行后同步更新详情面板", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <DesktopTaskWorkbench
          tasks={tasks}
          totalTasks={tasks}
          filters={filters}
          isLoading={false}
          onFiltersChange={vi.fn()}
          onResetFilters={vi.fn()}
          onCreateTask={vi.fn()}
          onImportTasks={vi.fn(async () => 0)}
          onUpdateTask={vi.fn()}
          onUpdateStatus={vi.fn()}
          onDeleteTask={vi.fn()}
        />
      </ToastProvider>,
    );

    expect(await screen.findByRole("heading", { name: "第一项任务" })).toBeInTheDocument();

    const rows = screen.getAllByRole("row");
    const secondRow = rows[2];
    secondRow.focus();
    await user.keyboard("{Enter}");

    expect(secondRow).toHaveFocus();
    expect(await screen.findByRole("heading", { name: "第二项任务" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "第一项任务" })).not.toBeInTheDocument();
  });

  it("在窄桌面按需打开详情，按 Escape 返回仍在原位的列表", async () => {
    const user = userEvent.setup();
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        media: "(min-width: 1321px)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    try {
      render(
        <ToastProvider>
          <DesktopTaskWorkbench
            tasks={tasks}
            totalTasks={tasks}
            filters={filters}
            isLoading={false}
            onFiltersChange={vi.fn()}
            onResetFilters={vi.fn()}
            onCreateTask={vi.fn()}
            onImportTasks={vi.fn(async () => 0)}
            onUpdateTask={vi.fn()}
            onUpdateStatus={vi.fn()}
            onDeleteTask={vi.fn()}
          />
        </ToastProvider>,
      );

      expect(screen.queryByLabelText("正在加载任务详情")).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "第一项任务" })).not.toBeInTheDocument();
      const list = screen.getByRole("rowgroup", { name: "可滚动任务列表" });
      await user.click(screen.getByText("第二项任务"));
      const detail = await screen.findByRole("heading", { name: "第二项任务" });
      await waitFor(() => expect(detail.closest("aside")?.parentElement).toHaveFocus());
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("heading", { name: "第二项任务" })).not.toBeInTheDocument();
      expect(screen.getByRole("rowgroup", { name: "可滚动任务列表" })).toBe(list);
    } finally {
      Object.defineProperty(window, "matchMedia", { configurable: true, value: originalMatchMedia });
    }
  });
});
