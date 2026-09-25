// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
  });

  it("显示未完成任务节点和创建任务入口", () => {
    render(<DashboardEmptyOrbit {...defaultProps} tasks={[task]} />);

    expect(screen.getByRole("button", { name: "整理项目方案" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "整理项目方案" })).toHaveClass(
      "dashboard-empty-orbit__node--high",
      "dashboard-empty-orbit__node--todo",
    );
    expect(screen.getByRole("button", { name: /整理项目方案/ })).toHaveAttribute(
      "data-tooltip",
      "待开始 · 高优先级 · 无截止日期",
    );
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

  it("支持滚轮缩放任务空间", () => {
    render(<DashboardEmptyOrbit {...defaultProps} tasks={[task]} />);

    const space = document.querySelector(".dashboard-empty-orbit__space");

    expect(space).toHaveStyle("transform: perspective(900px) rotateX(-8deg) rotateY(12deg) scale(1)");

    fireEvent.wheel(space as Element, { deltaY: -100 });

    expect(space).toHaveStyle("transform: perspective(900px) rotateX(-8deg) rotateY(12deg) scale(1.1)");
  });

  it("在用户偏好减少动画时进入静态模式", () => {
    const matchMedia = vi.fn().mockReturnValue({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
    Object.defineProperty(window, "matchMedia", { configurable: true, value: matchMedia });

    render(<DashboardEmptyOrbit {...defaultProps} tasks={[task]} />);

    expect(document.querySelector(".dashboard-empty-orbit__space")).toHaveAttribute("data-render-mode", "static");
  });
});
