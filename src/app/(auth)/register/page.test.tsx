import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/auth/components/register-form", () => ({
  RegisterForm: () => <div data-testid="register-form" />,
}));

describe("RegisterPage", () => {
  it("wraps RegisterForm in Suspense", async () => {
    const { default: RegisterPage } = await import("./page");
    const element = RegisterPage();

    expect(element.type).toBe(Suspense);
  });
});
