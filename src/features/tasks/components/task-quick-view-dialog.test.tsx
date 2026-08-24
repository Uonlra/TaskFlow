// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TaskQuickViewDialog } from "@/features/tasks/components/task-quick-view-dialog";

const task = {
  id: "task-1",
  title: "整理项目方案",
  description: "确认任务查看弹窗的内容和操作。",
  status: "in_progress" as const,
  priority: "high" as const,
  tags: [],
  createdAt: "2026-08-24T08:00:00.000Z",
};

describe("TaskQuickViewDialog", () => {
  it("展示任务名称、描述和状态，并支持关闭", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <TaskQuickViewDialog
        task={task}
        onClose={onClose}
        onEdit={vi.fn()}
        onToggleComplete={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "整理项目方案" })).toBeVisible();
    expect(screen.getByText("确认任务查看弹窗的内容和操作。")).toBeVisible();
    expect(screen.getByText("进行中")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "关闭任务查看" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("将操作委托给外部回调", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onToggleComplete = vi.fn();
    const onDelete = vi.fn();

    render(
      <TaskQuickViewDialog
        task={task}
        onClose={vi.fn()}
        onEdit={onEdit}
        onToggleComplete={onToggleComplete}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole("button", { name: "编辑任务" }));
    await user.click(screen.getByRole("button", { name: "标记为完成" }));
    await user.click(screen.getByRole("button", { name: "删除任务" }));

    expect(onEdit).toHaveBeenCalledWith(task);
    expect(onToggleComplete).toHaveBeenCalledWith(task);
    expect(onDelete).toHaveBeenCalledWith(task);
  });
});
