import { describe, expect, it } from "vitest";

import type { Task } from "@/features/tasks/types/task.types";
import { buildStatsTrend } from "@/features/stats/stats-trend";

const today = new Date(2026, 10, 26, 14);

function task(createdAt: Date, completedAt?: Date): Task {
  return {
    id: createdAt.toISOString(),
    title: "任务",
    description: "",
    createdAt: createdAt.toISOString(),
    completedAt: completedAt?.toISOString(),
    status: completedAt ? "done" : "todo",
    priority: "medium",
    tags: [],
  };
}

describe("buildStatsTrend", () => {
  it("本周从周一开始，分别汇总跨周任务的新增和完成时间", () => {
    const trend = buildStatsTrend(
      [
        task(new Date(2026, 10, 22, 15), new Date(2026, 10, 23, 10)),
        task(new Date(2026, 10, 26, 9)),
        task(new Date(2026, 10, 27, 9)),
      ],
      "week",
      today,
    );

    expect(trend.points.map(({ label, created, completed }) => [label, created, completed])).toEqual([
      ["11/23", 0, 1],
      ["11/24", 0, 0],
      ["11/25", 0, 0],
      ["11/26", 1, 0],
    ]);
  });

  it("今天只有新增时仍有趋势，历史任务不会变成今日新增", () => {
    const older = task(new Date(2026, 10, 25, 17));
    expect(buildStatsTrend([older], "today", today).points).toEqual([]);

    const trend = buildStatsTrend([older, task(new Date(2026, 10, 26, 9))], "today", today);
    expect(trend.points.find((point) => point.label === "08:00")).toMatchObject({ created: 1, completed: 0 });
    expect(trend.points.every((point) => point.completed === 0)).toBe(true);
  });

  it("全部范围保留早期数据，跨年历史归入对应年份", () => {
    const trend = buildStatsTrend([task(new Date(2023, 0, 2, 12), new Date(2026, 10, 26, 12))], "all", today);
    expect(trend.intervalLabel).toBe("按年");
    expect(trend.points[0]).toMatchObject({ label: "2023", created: 1, completed: 0 });
    expect(trend.points.at(-1)).toMatchObject({ label: "2026", created: 0, completed: 1 });
  });
});
