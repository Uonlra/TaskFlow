// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SettingsPage from "@/app/(dashboard)/settings/page";

vi.mock("@/features/settings/components/settings-client", () => ({
  SettingsClient: () => <div>设置内容</div>,
}));

describe("SettingsPage", () => {
  it("只保留隐藏页面标题", () => {
    render(<SettingsPage />);

    expect(screen.getByRole("heading", { name: "设置", level: 1 })).toHaveClass("visually-hidden");
    expect(screen.queryByText("个人信息")).not.toBeInTheDocument();
    expect(screen.queryByText("管理个人资料和账号信息。")).not.toBeInTheDocument();
  });
});
