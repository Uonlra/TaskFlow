// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
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
