// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { buildStatsInsight, StatsToolbar } from "@/features/stats/components/stats-client";

describe("StatsToolbar", () => {
  it("只显示范围控制并保留隐藏页面标题", async () => {
    const user = userEvent.setup();
    const onRangeChange = vi.fn();

    render(<StatsToolbar range="week" isSyncing={false} onRangeChange={onRangeChange} />);

    expect(screen.getByRole("banner", { name: "统计" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "统计", level: 1 })).toHaveClass("visually-hidden");
    expect(screen.queryByText("统计范围")).not.toBeInTheDocument();
    expect(screen.queryByText("任务数据详情")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "本周" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "全部" }));
    expect(onRangeChange).toHaveBeenCalledWith("all");
  });
});

describe("buildStatsInsight", () => {
  it("范围为空时不将零任务描述为全部完成", () => {
    expect(
      buildStatsInsight({
        range: "week",
        totalCount: 0,
        completedCount: 0,
        activeCount: 0,
        completionRate: 0,
        overdueCount: 0,
      }),
    ).toBe("本周暂无任务数据。");
  });

  it("优先提示逾期风险", () => {
    expect(
      buildStatsInsight({
        range: "week",
        totalCount: 8,
        completedCount: 5,
        activeCount: 3,
        completionRate: 63,
        overdueCount: 2,
      }),
    ).toBe("本周有 2 项逾期，完成率 63%，建议优先处理风险任务。");
  });

  it("区分全部完成与稳定推进", () => {
    expect(
      buildStatsInsight({
        range: "today",
        totalCount: 4,
        completedCount: 4,
        activeCount: 0,
        completionRate: 100,
        overdueCount: 0,
      }),
    ).toBe("今天的 4 项均已完成。");

    expect(
      buildStatsInsight({
        range: "all",
        totalCount: 10,
        completedCount: 8,
        activeCount: 2,
        completionRate: 80,
        overdueCount: 0,
      }),
    ).toBe("全部任务已完成 8/10 项，整体节奏稳定。");
  });
});
