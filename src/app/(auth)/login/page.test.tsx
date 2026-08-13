import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/auth/components/login-form", () => ({
  LoginForm: () => <div data-testid="login-form" />,
}));

describe("LoginPage", () => {
  it("wraps LoginForm in Suspense", async () => {
    const { default: LoginPage } = await import("./page");
    const element = LoginPage();

    expect(element.type).toBe(Suspense);
  });
});
