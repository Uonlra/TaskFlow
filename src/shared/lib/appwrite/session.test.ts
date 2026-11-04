import { describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

import { attachAppwriteSessionCookie } from "@/shared/lib/appwrite/session";

describe("desktop session cookie", () => {
  it("allows the packaged Electron origin to retain a cross-site session", () => {
    vi.stubEnv("DESKTOP_ALLOWED_ORIGINS", "");
    const request = new Request("https://taskflow.example/api/auth/login", {
      headers: { origin: "app://taskflow" },
    });
    const response = NextResponse.json({ ok: true });

    attachAppwriteSessionCookie(response, { secret: "test-session" }, request);

    const cookie = response.headers.get("set-cookie");
    expect(cookie).toContain("SameSite=none");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("HttpOnly");
  });
});
