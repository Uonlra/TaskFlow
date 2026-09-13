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

  it("displays the active filter count in the readable filter entry", () => {
    renderMenu({
      filters: {
        ...initialFilters,
        status: "in_progress",
        due: "near",
      },
    });

    const filterButton = screen.getByRole("button", { name: "筛选优先处理任务（已启用）" });

    expect(filterButton).toHaveTextContent("筛选");
    expect(filterButton).toHaveTextContent("2");
    expect(filterButton).toHaveClass("is-active");
  });

  it("groups low-frequency dashboard links in the more menu", async () => {
    const user = userEvent.setup();

    renderMenu();
    const moreTrigger = document.querySelector<HTMLElement>(".dashboard-range-menu__more > summary");
    expect(moreTrigger).toBeInTheDocument();
    await user.click(moreTrigger!);

    const menu = screen.getByRole("menu", { name: "更多总览操作" });
    expect(within(menu).getByRole("menuitem", { name: "查看任务列表" })).toHaveAttribute("href", "/tasks");
    expect(within(menu).getByRole("menuitem", { name: "查看统计分析" })).toHaveAttribute("href", "/stats");

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(document.querySelector(".dashboard-range-menu__more")).not.toHaveAttribute("open");
    });
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
