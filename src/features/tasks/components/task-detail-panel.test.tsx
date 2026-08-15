// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TaskDetailPanel } from "@/features/tasks/components/task-detail-panel";
import type { Task } from "@/features/tasks/types/task.types";

const task: Task = {
  id: "task-1",
  title: "整理任务详情",
  description: "检查右侧信息层级。",
  status: "todo",
  priority: "medium",
  tags: ["设计", "总览"],
  dueDate: "2026-08-20",
  createdAt: "2026-08-15T08:00:00.000Z",
  updatedAt: "2026-08-15T09:00:00.000Z",
  completedAt: "2026-08-15T10:00:00.000Z",
};

describe("TaskDetailPanel", () => {
  it("uses the lower detail section as a tag board instead of a note", () => {
    renderPanel(task);

    expect(screen.getByRole("heading", { name: "标签" })).toBeInTheDocument();
    expect(screen.getByLabelText("任务标签")).toHaveTextContent("#设计");
    expect(screen.getByLabelText("任务标签")).toHaveTextContent("#总览");
    expect(screen.queryByRole("heading", { name: "备注" })).not.toBeInTheDocument();
  });

  it("shows an explicit empty state when the task has no tags", () => {
    renderPanel({ ...task, tags: [] });

    expect(screen.getByText("未添加")).toBeInTheDocument();
    expect(screen.getByText("暂无标签，可通过编辑任务添加。")).toBeInTheDocument();
  });

  it("shows verified activity events in reverse chronological order", async () => {
    const user = userEvent.setup();
    renderPanel(task);

    await user.click(screen.getByRole("tab", { name: "活动" }));

    const activityPanel = screen.getByRole("tabpanel", { name: "活动" });
    const items = within(activityPanel).getAllByRole("listitem");

    expect(items).toHaveLength(3);
    expect(items.map((item) => within(item).getByRole("strong").textContent)).toEqual([
      "完成任务",
      "最近更新",
      "创建任务",
    ]);
    expect(screen.queryByRole("heading", { name: "标签" })).not.toBeInTheDocument();
  });

  it("shows only creation when no later activity is recorded", async () => {
    const user = userEvent.setup();
    renderPanel({ ...task, updatedAt: undefined, completedAt: undefined });

    await user.click(screen.getByRole("tab", { name: "活动" }));

    expect(screen.getByText("创建任务")).toBeInTheDocument();
    expect(screen.queryByText("最近更新")).not.toBeInTheDocument();
    expect(screen.queryByText("完成任务")).not.toBeInTheDocument();
  });

  it("omits a redundant update event when created and updated timestamps match", async () => {
    const user = userEvent.setup();
    renderPanel({ ...task, updatedAt: task.createdAt, completedAt: undefined });

    await user.click(screen.getByRole("tab", { name: "活动" }));

    expect(screen.queryByText("最近更新")).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("supports arrow-key navigation between detail tabs", async () => {
    const user = userEvent.setup();
    renderPanel(task);

    const detailsTab = screen.getByRole("tab", { name: "详情" });
    detailsTab.focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "活动" })).toHaveFocus();
    expect(screen.getByRole("tabpanel", { name: "活动" })).toBeInTheDocument();
  });
});

function renderPanel(currentTask: Task) {
  return render(
    <TaskDetailPanel
      task={currentTask}
      onUpdateTask={vi.fn()}
      onUpdateStatus={vi.fn()}
      onDeleteTask={vi.fn()}
    />,
  );
}
