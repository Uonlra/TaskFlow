// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StatsToolbar } from "@/features/stats/components/stats-client";

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
