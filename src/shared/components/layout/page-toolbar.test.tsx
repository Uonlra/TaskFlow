// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageToolbar } from "@/shared/components/layout/page-toolbar";

describe("PageToolbar", () => {
  it("保留隐藏页面标题并按插槽顺序渲染工具", () => {
    render(
      <PageToolbar
        accessibleTitle="任务"
        context={<span>35 项</span>}
        controls={<button type="button">筛选</button>}
        secondaryActions={<button type="button">更多</button>}
        primaryAction={<button type="button">新建任务</button>}
      />,
    );

    const toolbar = screen.getByRole("banner", { name: "任务" });
    const heading = within(toolbar).getByRole("heading", { name: "任务", level: 1 });

    expect(heading).toHaveClass("visually-hidden");
    expect(within(toolbar).getByText("35 项")).toBeInTheDocument();
    expect(within(toolbar).getByRole("button", { name: "筛选" })).toBeInTheDocument();
    expect(within(toolbar).getByRole("button", { name: "更多" })).toBeInTheDocument();
    expect(within(toolbar).getByRole("button", { name: "新建任务" })).toBeInTheDocument();
  });

  it("没有可选插槽时仍然提供可访问的空工具栏", () => {
    render(<PageToolbar accessibleTitle="统计" />);

    expect(screen.getByRole("banner", { name: "统计" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "统计", level: 1 })).toHaveClass("visually-hidden");
  });
});
