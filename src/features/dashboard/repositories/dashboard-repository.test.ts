import { afterEach, describe, expect, it, vi } from "vitest";
import { dashboardRepository } from "@/features/dashboard/repositories/dashboard-repository";
import { buildDashboardStats } from "@/features/tasks/utils/task-analytics";

afterEach(() => vi.restoreAllMocks());

describe("dashboardRepository", () => {
  it("serializes range and focus filters and forwards the abort signal", async () => {
    const payload = { stats: buildDashboardStats([], { range: "week" }), hasAnyTasks: true };
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(Response.json(payload));
    const controller = new AbortController();
    await expect(
      dashboardRepository.getSummary(
        { range: "week", status: "done", priority: "high", due: "overdue" },
        { signal: controller.signal },
      ),
    ).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/dashboard/summary?range=week&status=done&priority=high&due=overdue",
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it("omits default filters", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(Response.json({ stats: {}, hasAnyTasks: false }));
    await dashboardRepository.getSummary({ range: "today", status: "all", priority: "all", due: "" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/dashboard/summary?range=today");
  });

  it("propagates API errors and rejects malformed successful responses", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(Response.json({ message: "总览暂时不可用" }, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ hasAnyTasks: false }));
    const query = { range: "today", status: "all", priority: "all", due: "" } as const;
    await expect(dashboardRepository.getSummary(query)).rejects.toThrow("总览暂时不可用");
    await expect(dashboardRepository.getSummary(query)).rejects.toThrow("无法加载总览数据");
  });
});
