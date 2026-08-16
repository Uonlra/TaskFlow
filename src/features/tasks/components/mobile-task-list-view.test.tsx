// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MobileTaskListView } from "@/features/tasks/components/mobile-task-list-view";
import type { TaskFilters } from "@/features/tasks/types/task-filters";
import type { Task } from "@/features/tasks/types/task.types";

vi.mock("@/features/tasks/components/task-form-dialog", () => ({
  TaskFormDialog: () => <button type="button">新增</button>,
}));

const filters: TaskFilters = {
  query: "旧搜索",
  tag: "旧标签",
  status: "all",
  priority: "high",
  due: "",
  risk: "high",
  date: "2026-08-17",
  range: "week",
  sort: "priority_desc",
};

const tasks: Task[] = [
  {
    id: "task-1",
    title: "测试任务",
    description: "",
    status: "todo",
    priority: "medium",
    tags: [],
    dueDate: "2026-08-17",
    createdAt: "2026-08-17T08:00:00.000Z",
  },
];

function renderTaskList(onFiltersChange = vi.fn()) {
  render(
    <MobileTaskListView
      tasks={tasks}
      totalCount={tasks.length}
      filters={filters}
      isLoading={false}
      onFiltersChange={onFiltersChange}
      onCreateTask={() => {}}
      onUpdateStatus={() => {}}
    />,
  );

  return onFiltersChange;
}

describe("MobileTaskListView", () => {
  it("显示今天、临近、未完成和已完成四个快捷筛选", () => {
    renderTaskList();

    expect(screen.getByRole("button", { name: "今天" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "临近" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "未完成" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "已完成" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "重要" })).not.toBeInTheDocument();
  });

  it("按下快捷筛选时写入明确的日期与状态条件", async () => {
    const user = userEvent.setup();
    const onFiltersChange = renderTaskList();

    await user.click(screen.getByRole("button", { name: "今天" }));
    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "all", due: "today", sort: "due_asc", query: "", tag: "" }),
    );

    await user.click(screen.getByRole("button", { name: "临近" }));
    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "all", due: "near", sort: "due_asc", priority: "all", risk: "" }),
    );

    await user.click(screen.getByRole("button", { name: "未完成" }));
    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "active", due: "", sort: "due_asc", date: "", range: "" }),
    );

    await user.click(screen.getByRole("button", { name: "已完成" }));
    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "done", due: "", sort: "updated_desc", date: "", range: "" }),
    );
  });
});
