// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DesktopTaskWorkbench } from "@/features/tasks/components/desktop-task-workbench";
import type { TaskFilters } from "@/features/tasks/types/task-filters";
import type { Task } from "@/features/tasks/types/task.types";
import { ToastProvider } from "@/shared/providers/toast-provider";

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

    expect(screen.getByRole("heading", { name: "第一项任务" })).toBeInTheDocument();

    const rows = screen.getAllByRole("row");
    const secondRow = rows[2];
    secondRow.focus();
    await user.keyboard("{Enter}");

    expect(secondRow).toHaveFocus();
    expect(screen.getByRole("heading", { name: "第二项任务" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "第一项任务" })).not.toBeInTheDocument();
  });
});
