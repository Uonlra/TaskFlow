// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DashboardRangeMenu,
  type DashboardPriorityFilters,
} from "@/features/dashboard/components/dashboard-range-menu";

const rangeOptions = [
  { value: "today" as const, label: "今天" },
  { value: "week" as const, label: "本周" },
  { value: "all" as const, label: "全部" },
];

const initialFilters: DashboardPriorityFilters = {
  status: "all",
  priority: "all",
  due: "",
};

describe("DashboardRangeMenu", () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("closes the filter popover when clicking outside", async () => {
    const user = userEvent.setup();

    renderMenu();
    await user.click(screen.getByRole("button", { name: "筛选优先处理任务" }));
    expect(screen.getByRole("dialog", { name: "筛选优先处理任务" })).toBeInTheDocument();

    await user.click(document.body);

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "筛选优先处理任务" })).not.toBeInTheDocument();
    });
  });

  it("closes the filter popover with Escape and returns focus", async () => {
    const user = userEvent.setup();

    renderMenu();
    const trigger = screen.getByRole("button", { name: "筛选优先处理任务" });
    await user.click(trigger);

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "筛选优先处理任务" })).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });

  it("keeps the filter popover open while selecting a filter option", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();

    renderMenu({ onFiltersChange });
    await user.click(screen.getByRole("button", { name: "筛选优先处理任务" }));

    const dialog = screen.getByRole("dialog", { name: "筛选优先处理任务" });
    await user.click(within(dialog).getByRole("button", { name: "优先处理任务状态" }));
    await user.click(screen.getByRole("option", { name: "进行中" }));

    expect(onFiltersChange).toHaveBeenCalledWith({
      ...initialFilters,
      status: "in_progress",
    });
    expect(screen.getByRole("dialog", { name: "筛选优先处理任务" })).toBeInTheDocument();
  });
});

function renderMenu({
  filters = initialFilters,
  onFiltersChange = vi.fn(),
}: {
  filters?: DashboardPriorityFilters;
  onFiltersChange?: (filters: DashboardPriorityFilters) => void;
} = {}) {
  return render(
    <DashboardRangeMenu
      range="today"
      options={rangeOptions}
      onChange={vi.fn()}
      filters={filters}
      onFiltersChange={onFiltersChange}
    />,
  );
}
