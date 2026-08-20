// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DashboardShell } from "@/shared/components/layout/dashboard-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/tasks",
}));

vi.mock("@/features/auth/components/auth-action-gate", () => ({
  AuthActionGateProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/shared/components/layout/app-topbar", () => ({
  AppTopbar: () => <header>账号工具</header>,
}));

describe("DashboardShell accessibility", () => {
  it("将跳到主要内容作为第一个键盘入口", async () => {
    const user = userEvent.setup();
    render(
      <DashboardShell>
        <h1>任务页面</h1>
      </DashboardShell>,
    );

    await user.tab();

    const skipLink = screen.getByRole("link", { name: "跳到主要内容" });
    const main = screen.getByRole("main");
    expect(skipLink).toHaveFocus();
    expect(skipLink).toHaveAttribute("href", "#main-content");
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toHaveAttribute("tabindex", "-1");
  });

  it("为桌面和移动导航提供名称并标记当前页", () => {
    render(
      <DashboardShell>
        <h1>任务页面</h1>
      </DashboardShell>,
    );

    const desktopNavigation = screen.getByRole("navigation", { name: "主导航" });
    const mobileNavigation = screen.getByRole("navigation", { name: "移动导航" });

    expect(within(desktopNavigation).getByRole("link", { name: /任务/ })).toHaveAttribute("aria-current", "page");
    expect(within(mobileNavigation).getByRole("link", { name: "任务" })).toHaveAttribute("aria-current", "page");
    expect(within(desktopNavigation).getByRole("link", { name: /总览/ })).not.toHaveAttribute("aria-current");
  });

  it("可以切换侧边栏并更新无障碍标签", async () => {
    const user = userEvent.setup();
    render(
      <DashboardShell>
        <h1>任务页面</h1>
      </DashboardShell>,
    );

    const shell = screen.getByRole("main").parentElement?.parentElement;
    const collapseButton = screen.getByRole("button", { name: "收起侧边栏" });

    expect(shell).not.toHaveClass("dashboard-shell--sidebar-collapsed");
    await user.click(collapseButton);

    expect(screen.getByRole("button", { name: "展开侧边栏" })).toHaveAttribute("aria-expanded", "false");
    expect(shell).toHaveClass("dashboard-shell--sidebar-collapsed");
  });
});
