import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { proxy } from "../proxy";

vi.mock("@/shared/lib/appwrite/env", () => ({
  appwriteSessionCookieName: "taskflow-session",
  hasAppwriteAuthEnv: true,
}));

describe("proxy workspace access", () => {
  it.each(["/dashboard", "/tasks", "/tasks/task-1", "/calendar", "/stats"])("允许访客访问 %s", (pathname) => {
    const response = proxy(new NextRequest(`http://localhost${pathname}`));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("未登录访问设置页时跳转登录", () => {
    const response = proxy(new NextRequest("http://localhost/settings"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("未登录访问云端任务接口时返回 401", async () => {
    const response = proxy(new NextRequest("http://localhost/api/tasks"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: "请先登录后再执行此操作。" });
  });

  it("持有会话时允许访问受保护页面", () => {
    const response = proxy(
      new NextRequest("http://localhost/settings", {
        headers: { cookie: "taskflow-session=session-secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
