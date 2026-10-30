import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

import { createCorsPreflightResponse, withApiCors } from "@/shared/lib/api/cors";

describe("desktop API CORS", () => {
  it("允许配置的 Tauri 来源携带 Cookie 访问 API", () => {
    vi.stubEnv("DESKTOP_ALLOWED_ORIGINS", "http://tauri.localhost,https://tauri.localhost");
    const request = new NextRequest("https://taskflow.example/api/auth/me", {
      headers: { origin: "http://tauri.localhost" },
    });

    const response = withApiCors(NextResponse.json({ ok: true }), request);

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://tauri.localhost");
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });

  it("为预检请求返回 204", () => {
    vi.stubEnv("DESKTOP_ALLOWED_ORIGINS", "http://tauri.localhost");
    const request = new NextRequest("https://taskflow.example/api/auth/me", {
      method: "OPTIONS",
      headers: { origin: "http://tauri.localhost" },
    });

    const response = createCorsPreflightResponse(request);

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("OPTIONS");
  });
});
