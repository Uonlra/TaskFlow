import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/auth/lookup/route";

const mocks = vi.hoisted(() => ({
  getPublicAccountStatusByEmail: vi.fn(),
}));

vi.mock("@/shared/lib/appwrite/server", () => ({
  getPublicAccountStatusByEmail: mocks.getPublicAccountStatusByEmail,
}));

describe("GET /api/auth/lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("邮箱格式无效时返回 400 且不查询 Appwrite", async () => {
    const request = new NextRequest(
      "http://localhost/api/auth/lookup?email=invalid-email",
    );

    const response = await GET(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      status: "invalid",
      message: "请输入有效的邮箱地址。",
    });
    expect(mocks.getPublicAccountStatusByEmail).not.toHaveBeenCalled();
  });

  it("有效邮箱返回查询到的账号状态", async () => {
    mocks.getPublicAccountStatusByEmail.mockResolvedValue("registered");
    const request = new NextRequest(
      "http://localhost/api/auth/lookup?email=demo%40example.com",
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "registered",
      message: "这个邮箱看起来已经有记录了。登录后再展示真实进度。",
    });
    expect(mocks.getPublicAccountStatusByEmail).toHaveBeenCalledWith(
      "demo@example.com",
      request,
    );
  });
});
