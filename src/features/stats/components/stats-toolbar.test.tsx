// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StatsToolbar } from "@/features/stats/components/stats-client";

describe("StatsToolbar", () => {
  it("保留页面标题及范围切换，正文负责显示统计数据", async () => {
    const onRangeChange = vi.fn();
    render(<StatsToolbar range="week" onRangeChange={onRangeChange} />);

    const toolbar = screen.getByRole("banner", { name: "统计" });
    expect(within(toolbar).getByRole("heading", { name: "统计", level: 1 })).toBeInTheDocument();
    expect(within(toolbar).getByRole("button", { name: "本周" })).toHaveAttribute("aria-pressed", "true");
    expect(within(toolbar).queryByRole("progressbar")).not.toBeInTheDocument();
    expect(within(toolbar).queryByRole("img")).not.toBeInTheDocument();

    await userEvent.click(within(toolbar).getByRole("button", { name: "全部" }));
    expect(onRangeChange).toHaveBeenCalledWith("all");
  });
});
