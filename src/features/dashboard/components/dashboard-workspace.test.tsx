// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DashboardWorkspace } from "@/features/dashboard/components/dashboard-workspace";
import { buildDashboardStats } from "@/features/tasks/utils/task-analytics";

describe("DashboardWorkspace loading state", () => {
  it("keeps the primary layout visible with matching skeleton regions", () => {
    render(
      <DashboardWorkspace
        stats={buildDashboardStats([])}
        priorityTasks={[]}
        isLoading
        onStatusFilter={vi.fn()}
        onPreviewTask={vi.fn()}
        onToggleTask={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "优先处理" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "今日进度" })).toBeInTheDocument();
    expect(screen.getByLabelText("任务状态概览")).toHaveAttribute("aria-busy", "true");
    expect(document.querySelector(".dashboard-workspace__progress-body")).toHaveAttribute("aria-busy", "true");
    expect(document.querySelectorAll(".dashboard-workspace__task-skeleton")).toHaveLength(3);
  });

  it("keeps an empty priority area compact without explanatory copy", () => {
    render(
      <DashboardWorkspace
        stats={buildDashboardStats([])}
        priorityTasks={[]}
        isRangeEmpty
        onStatusFilter={vi.fn()}
        onPreviewTask={vi.fn()}
        onToggleTask={vi.fn()}
      />,
    );

    const emptyPriority = screen.getByText("暂无待处理任务").closest("section");

    expect(emptyPriority).toHaveClass("dashboard-workspace__priority--empty");
    expect(emptyPriority?.parentElement).toHaveClass("dashboard-workspace--empty");
    expect(screen.queryByText("当前范围内的任务会显示在这里。")).not.toBeInTheDocument();
  });

  it("does not infer a compact range state from an empty priority list", () => {
    render(
      <DashboardWorkspace
        stats={buildDashboardStats([])}
        priorityTasks={[]}
        onStatusFilter={vi.fn()}
        onPreviewTask={vi.fn()}
        onToggleTask={vi.fn()}
      />,
    );

    const emptyPriority = screen.getByText("暂无待处理任务").closest("section");

    expect(emptyPriority).not.toHaveClass("dashboard-workspace__priority--empty");
    expect(emptyPriority?.parentElement).not.toHaveClass("dashboard-workspace--empty");
  });
});

it("separates status changes and previews, and links tasks with evolution to their review page", async () => {
  const user = userEvent.setup();
  const onPreviewTask = vi.fn();
  const onToggleTask = vi.fn().mockResolvedValue(undefined);
  const stats = buildDashboardStats([], { range: "week" });
  const task = {
    id: "ordinary",
    title: "整理文档",
    description: "",
    status: "todo" as const,
    priority: "medium" as const,
    createdAt: "2026-11-26T00:00:00.000Z",
    dueLabel: "未设置截止日期",
    tags: [],
    hasEvolution: false,
  };

  render(
    <DashboardWorkspace
      stats={{ ...stats, completedCount: 1, totalCount: 2 }}
      priorityTasks={[task, { ...task, id: "evolved", title: "检查实验结果", hasEvolution: true }]}
      onStatusFilter={vi.fn()}
      onPreviewTask={onPreviewTask}
      onToggleTask={onToggleTask}
    />,
  );

  await user.click(screen.getByRole("button", { name: "标记为完成：整理文档" }));
  expect(onToggleTask).toHaveBeenCalledExactlyOnceWith(task);
  expect(onPreviewTask).not.toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: /^整理文档/ }));
  expect(onPreviewTask).toHaveBeenCalledExactlyOnceWith(task);
  expect(screen.queryByRole("button", { name: "标记为完成：检查实验结果" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "验收：检查实验结果" })).toHaveAttribute("href", "/tasks/evolved");
  expect(screen.getByRole("progressbar", { name: "本周进度" })).toHaveAttribute("value", "1");
});
