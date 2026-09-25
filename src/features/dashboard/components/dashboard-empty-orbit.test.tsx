// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { DashboardTaskPreview } from "@/features/tasks/utils/task-analytics";
import { DashboardEmptyOrbit } from "@/features/dashboard/components/dashboard-empty-orbit";

vi.mock("@/features/tasks/components/task-form-dialog", () => ({
  TaskFormDialog: ({ triggerLabel }: { triggerLabel?: string }) => (
    <button type="button">{triggerLabel ?? "新建任务"}</button>
  ),
}));

const task: DashboardTaskPreview = {
  id: "task-1",
  title: "整理项目方案",
  description: "补充方案细节",
  createdAt: "2026-09-25T08:00:00.000Z",
  status: "todo",
  priority: "high",
  dueDate: undefined,
  dueLabel: "无截止日期",
  tags: [],
};

const defaultProps = {
  onPreviewTask: vi.fn(),
  onCreateTask: vi.fn<(values: TaskFormValues) => Promise<void>>(),
};

describe("DashboardEmptyOrbit", () => {
  it("显示未完成任务节点和创建任务入口", () => {
    render(<DashboardEmptyOrbit {...defaultProps} tasks={[task]} />);

    expect(screen.getByRole("button", { name: "整理项目方案" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "创建任务" })).toBeInTheDocument();
    expect(screen.queryByText("空白空间")).not.toBeInTheDocument();
  });

  it("点击任务节点后打开任务速览", async () => {
    const user = userEvent.setup();
    const onPreviewTask = vi.fn();

    render(<DashboardEmptyOrbit {...defaultProps} onPreviewTask={onPreviewTask} tasks={[task]} />);

    await user.click(screen.getByRole("button", { name: "整理项目方案" }));

    expect(onPreviewTask).toHaveBeenCalledWith(task);
  });

  it("完成任务不会显示为漂浮任务节点", () => {
    render(<DashboardEmptyOrbit {...defaultProps} tasks={[{ ...task, status: "done" }]} />);

    expect(screen.queryByRole("button", { name: "整理项目方案" })).not.toBeInTheDocument();
    expect(screen.getByText("空白空间")).toBeInTheDocument();
  });
});
