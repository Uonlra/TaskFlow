import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAppwriteSessionSecret: vi.fn(),
  getCurrentAuthEnvelope: vi.fn(),
  listTasksForDashboard: vi.fn(),
}));

vi.mock("@/shared/lib/appwrite/session", () => ({
  getAppwriteSessionSecret: mocks.getAppwriteSessionSecret,
}));

vi.mock("@/shared/lib/appwrite/server", () => ({
  getCurrentAuthEnvelope: mocks.getCurrentAuthEnvelope,
}));

vi.mock("@/shared/lib/appwrite/tasks", () => ({
  listTasksForDashboard: mocks.listTasksForDashboard,
}));

import { GET } from "@/app/api/dashboard/summary/route";

const authEnvelope = { user: { id: "user-1" } };

describe("/api/dashboard/summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAppwriteSessionSecret.mockResolvedValue("session-secret");
    mocks.getCurrentAuthEnvelope.mockResolvedValue(authEnvelope);
    mocks.listTasksForDashboard.mockResolvedValue({ tasks: [], paceTasks: [], hasAnyTasks: false });
  });

  it("未登录时返回 401", async () => {
    mocks.getAppwriteSessionSecret.mockResolvedValue(null);

    const response = await GET(new NextRequest("http://localhost/api/dashboard/summary?range=today"));

    expect(response.status).toBe(401);
  });

  it("按范围和优先处理筛选返回聚合摘要", async () => {
    mocks.listTasksForDashboard.mockResolvedValue({
      hasAnyTasks: true,
      paceTasks: [],
      tasks: [
        {
          id: "high-1",
          title: "高优先级任务",
          description: "",
          status: "todo",
          priority: "high",
          tags: [],
          dueDate: "2099-01-01",
          createdAt: "2026-08-23T08:00:00.000Z",
        },
      ],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/dashboard/summary?range=all&status=todo&priority=high"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.hasAnyTasks).toBe(true);
    expect(payload.stats.totalCount).toBe(1);
    expect(payload.stats.focusTasks).toEqual([expect.objectContaining({ id: "high-1" })]);
    expect(mocks.listTasksForDashboard).toHaveBeenCalledWith("session-secret", "all", expect.any(NextRequest));
  });
});
