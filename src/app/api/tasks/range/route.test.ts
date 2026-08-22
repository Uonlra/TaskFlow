import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAppwriteSessionSecret: vi.fn(),
  getCurrentAuthEnvelope: vi.fn(),
  listTasksByDueRange: vi.fn(),
}));

vi.mock("@/shared/lib/appwrite/session", () => ({
  getAppwriteSessionSecret: mocks.getAppwriteSessionSecret,
}));

vi.mock("@/shared/lib/appwrite/server", () => ({
  getCurrentAuthEnvelope: mocks.getCurrentAuthEnvelope,
}));

vi.mock("@/shared/lib/appwrite/tasks", () => ({
  listTasksByDueRange: mocks.listTasksByDueRange,
}));

import { GET } from "@/app/api/tasks/range/route";

describe("/api/tasks/range", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAppwriteSessionSecret.mockResolvedValue("session-secret");
    mocks.getCurrentAuthEnvelope.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("只返回当前日期范围内的截止任务", async () => {
    mocks.listTasksByDueRange.mockResolvedValue({
      tasks: [{ id: "inside", dueDate: "2026-08-10" }],
      hasAnyTasks: true,
    });

    const response = await GET(new NextRequest("http://localhost/api/tasks/range?from=2026-08-10&to=2026-08-17"));

    expect(response.status).toBe(200);
    expect(mocks.listTasksByDueRange).toHaveBeenCalledWith(
      "session-secret",
      { from: "2026-08-10", to: "2026-08-17" },
      expect.any(NextRequest),
    );
    await expect(response.json()).resolves.toMatchObject({
      tasks: [{ id: "inside", dueDate: "2026-08-10" }],
      hasAnyTasks: true,
      range: "bounded",
    });
  });

  it("全部范围只保留有截止日期的任务", async () => {
    mocks.listTasksByDueRange.mockResolvedValue({
      tasks: [{ id: "dated", dueDate: "2026-08-10" }],
      hasAnyTasks: true,
    });

    const response = await GET(new NextRequest("http://localhost/api/tasks/range?range=all"));

    expect(mocks.listTasksByDueRange).toHaveBeenCalledWith("session-secret", { all: true }, expect.any(NextRequest));
    await expect(response.json()).resolves.toMatchObject({
      tasks: [{ id: "dated", dueDate: "2026-08-10" }],
      range: "all",
    });
  });
});
