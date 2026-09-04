// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MobileDashboardOverview } from "@/features/dashboard/components/mobile-dashboard-overview";
import { buildDashboardStats } from "@/features/tasks/utils/task-analytics";

vi.mock("@/features/tasks/components/task-form-dialog", () => ({
  TaskFormDialog: ({ triggerAriaLabel = "新增任务" }: { triggerAriaLabel?: string }) => (
    <button type="button" aria-label={triggerAriaLabel}>
      新增
    </button>
  ),
}));

describe("MobileDashboardOverview toolbar", () => {
  it("uses compact context without repeating the visible page title", () => {
    render(
      <MobileDashboardOverview
        stats={buildDashboardStats([])}
        range="today"
        rangeLabel="今天"
        isLoading={false}
        onRangeChange={vi.fn()}
        onCreateTask={vi.fn()}
        onPreviewTask={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "总览", level: 1 })).toHaveClass("visually-hidden");
    expect(screen.getByText(/\d+月\d+日/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "今天" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "本周" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "全部" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新增任务" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "今日", level: 1 })).not.toBeInTheDocument();
  });
});
