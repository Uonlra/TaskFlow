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
});
