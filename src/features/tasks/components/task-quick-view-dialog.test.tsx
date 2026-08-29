// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TaskQuickViewDialog } from "@/features/tasks/components/task-quick-view-dialog";

const task = {
  id: "task-1",
  title: "整理项目方案",
  description: "确认任务查看弹窗的内容和操作。",
  status: "in_progress" as const,
  priority: "high" as const,
  tags: ["设计"],
  dueDate: "2026-08-29",
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
    expect(screen.getByText("高优先级")).toBeVisible();
    expect(screen.getByText("#设计")).toBeVisible();

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
    await user.click(screen.getByRole("button", { name: "确认删除" }));

    expect(onEdit).toHaveBeenCalledWith(task);
    expect(onToggleComplete).toHaveBeenCalledWith(task);
    expect(onDelete).toHaveBeenCalledWith(task);
  });

  it("日历模式可在速览上方编辑任务，Escape 只关闭编辑表单", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onUpdateTask = vi.fn();

    render(
      <TaskQuickViewDialog
        task={task}
        onClose={onClose}
        onUpdateTask={onUpdateTask}
        onToggleComplete={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "编辑任务" }));
    expect(screen.getByRole("heading", { name: "调整这条任务" })).toBeInTheDocument();
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "调整这条任务" })).not.toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "整理项目方案" })).toBeInTheDocument();
  });
});
