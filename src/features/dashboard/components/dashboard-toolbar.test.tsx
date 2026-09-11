// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DashboardToolbar } from "@/features/dashboard/components/dashboard-v2-shell";
import { buildDashboardStats } from "@/features/tasks/utils/task-analytics";

describe("DashboardToolbar", () => {
  it("展示工作节奏和逾期风险状态", () => {
    const stats = {
      ...buildDashboardStats([]),
      activeCount: 6,
      inProgressCount: 2,
      completionRate: 40,
      overdueCount: 1,
    };

    render(
      <DashboardToolbar
        stats={stats}
        range="week"
        rangeLabel="本周"
        isLoading={false}
        rangeOptions={[{ value: "week", label: "本周" }]}
        onRangeChange={vi.fn()}
        priorityFilters={{ status: "all", priority: "all", due: "" }}
        onPriorityFiltersChange={vi.fn()}
        onCreateTask={vi.fn()}
      />,
    );

    expect(screen.getByRole("banner", { name: "总览" })).toBeInTheDocument();
    expect(screen.getByText("工作总览")).toBeInTheDocument();
    expect(screen.getByText("1 项逾期需要处理")).toBeInTheDocument();
    expect(screen.getByLabelText("当前范围完成率 40%")).toBeInTheDocument();
    expect(document.querySelector(".dashboard-page-toolbar.is-risk")).toBeInTheDocument();
  });
});
