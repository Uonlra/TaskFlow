// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TaskPageSkeleton } from "@/features/tasks/components/task-page-skeleton";

describe("TaskPageSkeleton", () => {
  it("同时预留桌面工作台和移动列表的响应式布局", () => {
    const { container } = render(<TaskPageSkeleton />);

    expect(screen.getAllByLabelText("正在加载任务")).toHaveLength(2);
    expect(container.querySelector(".desktop-task-workbench")).toHaveAttribute("aria-busy", "true");
    expect(container.querySelectorAll(".task-page-skeleton__row")).toHaveLength(7);
    expect(container.querySelector(".task-detail-panel--skeleton")).toBeInTheDocument();
    expect(container.querySelector(".mobile-task-list")).toHaveAttribute("aria-busy", "true");
    expect(container.querySelectorAll(".task-page-skeleton__mobile-item")).toHaveLength(6);
  });
});
