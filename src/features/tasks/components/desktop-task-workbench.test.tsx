// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DesktopTaskWorkbench } from "@/features/tasks/components/desktop-task-workbench";
import type { TaskFilters } from "@/features/tasks/types/task-filters";
import type { Task } from "@/features/tasks/types/task.types";
import { createTaskExportPayload, PartialTaskImportError } from "@/features/tasks/utils/task-transfer";
import { ToastProvider } from "@/shared/providers/toast-provider";

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockTaskDetailPanel({ task }: { task: Task | null }) {
      return task ? (
        <aside>
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

  it("移动断点下保留详情占位，但不挂载详情模块", () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        media: "(min-width: 961px)",
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

      expect(screen.getByLabelText("正在加载任务详情")).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "第一项任务" })).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(window, "matchMedia", { configurable: true, value: originalMatchMedia });
    }
  });
});
