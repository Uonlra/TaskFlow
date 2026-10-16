import {
  buildDashboardSummaryParams,
  type DashboardSummary,
  type DashboardSummaryQuery,
} from "@/features/dashboard/types/dashboard-query";
import { requestJson } from "@/shared/lib/api/client";

export const dashboardRepository = {
  async getSummary(query: DashboardSummaryQuery, options?: { signal?: AbortSignal }): Promise<DashboardSummary> {
    const payload = await requestJson<DashboardSummary>(
      `/api/dashboard/summary?${buildDashboardSummaryParams(query)}`,
      options,
    );
    if (!payload?.stats || typeof payload.hasAnyTasks !== "boolean") throw new Error("无法加载总览数据。");
    return payload;
  },
};
