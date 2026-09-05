// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
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
      />,
    );

    const emptyPriority = screen.getByText("暂无待处理任务").closest("section");

    expect(emptyPriority).not.toHaveClass("dashboard-workspace__priority--empty");
    expect(emptyPriority?.parentElement).not.toHaveClass("dashboard-workspace--empty");
  });
});
