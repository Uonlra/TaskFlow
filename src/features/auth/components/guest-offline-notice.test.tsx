// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GuestOfflineNotice } from "@/features/auth/components/guest-offline-notice";

const mocks = vi.hoisted(() => ({
  pathname: "/tasks",
  user: null as { id: string } | null,
  isLoading: false,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
}));

vi.mock("@/features/auth/providers/auth-provider", () => ({
  useAuth: () => ({ user: mocks.user, isLoading: mocks.isLoading }),
}));

describe("GuestOfflineNotice", () => {
  beforeEach(() => {
    mocks.pathname = "/tasks";
    mocks.user = null;
    mocks.isLoading = false;
  });

  it.each(["/dashboard", "/tasks", "/tasks/task-1", "/calendar", "/stats"])(
    "在访客工作区 %s 显示临时保存提示",
    (pathname) => {
      mocks.pathname = pathname;
      render(<GuestOfflineNotice />);

      expect(screen.getByRole("status", { name: "访客数据保存状态" })).toBeInTheDocument();
      expect(screen.getByText("离线访客模式")).toBeInTheDocument();
      expect(screen.getByText("数据临时保存在当前浏览器，关闭后将无法恢复。")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "登录并同步" })).toHaveAttribute(
        "href",
        `/login?next=${encodeURIComponent(pathname)}`,
      );
    },
  );

  it("登录用户不显示访客提示", () => {
    mocks.user = { id: "user-1" };
    render(<GuestOfflineNotice />);

    expect(screen.queryByRole("status", { name: "访客数据保存状态" })).not.toBeInTheDocument();
  });

  it("认证加载中不提前显示访客提示", () => {
    mocks.isLoading = true;
    render(<GuestOfflineNotice />);

    expect(screen.queryByRole("status", { name: "访客数据保存状态" })).not.toBeInTheDocument();
  });

  it("设置页不显示四个工作区页面的提示", () => {
    mocks.pathname = "/settings";
    render(<GuestOfflineNotice />);

    expect(screen.queryByRole("status", { name: "访客数据保存状态" })).not.toBeInTheDocument();
  });
});
