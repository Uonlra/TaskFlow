// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { useState } from "react";
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

function renderTaskList(
  onFiltersChange = vi.fn(),
  currentFilters: TaskFilters = filters,
  currentTasks: Task[] = tasks,
  onUpdateStatus = vi.fn(),
) {
  render(
    <ControlledTaskList
      initialFilters={currentFilters}
      tasks={currentTasks}
      onFiltersChange={onFiltersChange}
      onUpdateStatus={onUpdateStatus}
    />,
  );

  return { onFiltersChange, onUpdateStatus };
}

describe("MobileTaskListView", () => {
  it("使用紧凑上下文和隐藏页面标题", () => {
    renderTaskList();

    expect(screen.getByRole("heading", { name: "任务", level: 1 })).toHaveClass("visually-hidden");
    expect(screen.getByText("1 项")).toBeInTheDocument();
    expect(screen.queryByText("同步中")).not.toBeInTheDocument();
  });

  it("显示近期、未完成、已完成和全部四个快捷筛选", () => {
    renderTaskList();

    expect(screen.getByRole("button", { name: "近期" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "未完成" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "已完成" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "全部" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "重要" })).not.toBeInTheDocument();
  });

  it("按下快捷筛选时写入明确的日期与状态条件", async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderTaskList();

    await user.click(screen.getByRole("button", { name: "近期" }));
    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "active", due: "near", sort: "due_asc", priority: "all", risk: "" }),
    );

    await user.click(screen.getByRole("button", { name: "未完成" }));
    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "active", due: "", sort: "due_asc", date: "", range: "" }),
    );

    await user.click(screen.getByRole("button", { name: "已完成" }));
    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "done", due: "", sort: "updated_desc", date: "", range: "" }),
    );

    await user.click(screen.getByRole("button", { name: "全部" }));
    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "all", due: "", sort: "due_asc", query: "", tag: "", priority: "all" }),
    );
  });

  it("通过键盘操作搜索框和快捷筛选", async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderTaskList();

    const search = screen.getByRole("searchbox", { name: "搜索任务" });
    search.focus();
    await user.clear(search);
    await user.type(search, "task");

    expect(onFiltersChange).toHaveBeenLastCalledWith(expect.objectContaining({ query: "task" }));

    const nearFilter = screen.getByRole("button", { name: "近期" });
    nearFilter.focus();
    await user.keyboard("{Enter}");

    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "active", due: "near", query: "" }),
    );
  });

  it("向辅助技术暴露当前快捷筛选状态", () => {
    renderTaskList(vi.fn(), { ...filters, query: "", status: "active", due: "near" });

    expect(screen.getByRole("button", { name: "近期" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "全部" })).toHaveAttribute("aria-pressed", "false");
  });

  it("通过键盘切换任务完成状态，并保留独立的详情链接", async () => {
    const user = userEvent.setup();
    const onUpdateStatus = vi.fn();
    renderTaskList(vi.fn(), filters, tasks, onUpdateStatus);

    const statusButton = screen.getByRole("button", { name: "标记为完成" });
    statusButton.focus();
    await user.keyboard("{Enter}");

    expect(onUpdateStatus).toHaveBeenCalledWith("task-1", "done");
    expect(screen.getByRole("link", { name: /测试任务/ })).toHaveAttribute("href", "/tasks/task-1");
  });

  it("按自然顺序从快捷筛选进入任务操作和详情链接", async () => {
    const user = userEvent.setup();
    renderTaskList();

    const doneFilter = screen.getByRole("button", { name: "已完成" });
    doneFilter.focus();

    await user.tab();
    expect(screen.getByRole("button", { name: "全部" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "标记为完成" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("link", { name: /测试任务/ })).toHaveFocus();
  });
});

function ControlledTaskList({
  initialFilters,
  tasks: currentTasks,
  onFiltersChange,
  onUpdateStatus,
}: {
  initialFilters: TaskFilters;
  tasks: Task[];
  onFiltersChange: (filters: TaskFilters) => void;
  onUpdateStatus: (id: string, status: Task["status"]) => void;
}) {
  const [currentFilters, setCurrentFilters] = useState(initialFilters);

  return (
    <MobileTaskListView
      tasks={currentTasks}
      totalCount={currentTasks.length}
      filters={currentFilters}
      isLoading={false}
      onFiltersChange={(nextFilters) => {
        setCurrentFilters(nextFilters);
        onFiltersChange(nextFilters);
      }}
      onCreateTask={() => {}}
      onUpdateStatus={onUpdateStatus}
    />
  );
}
