// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PageToolbarTemporalContext } from "@/shared/components/layout/page-toolbar-context";

describe("PageToolbarTemporalContext", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("显示当前日期时间、范围和同步状态", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T14:32:00+08:00"));

    render(<PageToolbarTemporalContext rangeLabel="本周" statusLabel="同步中" />);

    expect(screen.getByLabelText(/当前时间/)).toBeInTheDocument();
    expect(screen.getByText(/2026年9月6日/)).toBeInTheDocument();
    expect(screen.getByText("14:32")).toBeInTheDocument();
    expect(screen.getByText("本周")).toBeInTheDocument();
    expect(screen.getByText("同步中")).toHaveAttribute("role", "status");
  });
});
