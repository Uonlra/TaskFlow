// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CalendarToolbar } from "@/features/calendar/components/calendar-client";

describe("CalendarToolbar", () => {
  it("保留日期上下文和控制，同时隐藏页面标题与长期同步文案", async () => {
    const user = userEvent.setup();
    const onDateChange = vi.fn();
    const onRangeChange = vi.fn();

    render(
      <CalendarToolbar
        date={new Date(2026, 8, 4)}
        dateParam="2026-09-04"
        range="week"
        rangeLabel="本周"
        isSyncing={false}
        isAccountEmpty={false}
        onDateChange={onDateChange}
        onRangeChange={onRangeChange}
      />,
    );

    expect(screen.getByRole("banner", { name: "日历" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "日历", level: 1 })).toHaveClass("visually-hidden");
    expect(screen.getByRole("link", { name: /2026-09-04.*本周/ })).toBeInTheDocument();
    expect(screen.queryByText("已同步")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "全部" }));
    expect(onRangeChange).toHaveBeenCalledWith("all");

    await user.click(screen.getByRole("button", { name: "上个月" }));
    expect(onDateChange).toHaveBeenCalledWith(expect.any(Date));
    expect(onDateChange.mock.calls[0][0].getMonth()).toBe(7);
  });
});
