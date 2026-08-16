import { describe, expect, it } from "vitest";

import type { Task } from "@/features/tasks/types/task.types";
import { buildDashboardStats } from "@/features/tasks/utils/task-analytics";

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "task-1",
  title: "测试任务",
  description: "",
  status: "todo",
  priority: "medium",
  tags: [],
  createdAt: "2026-08-01T10:00:00.000Z",
  ...overrides,
});

describe("buildDashboardStats", () => {
  it("builds today pace from real completion times, statuses, and due dates", () => {
    const referenceDate = new Date(2026, 7, 2, 10, 0, 0);
    const tasks = [
      makeTask({
        id: "completed-today",
        status: "done",
        completedAt: "2026-08-02T09:30:00.000Z",
        dueDate: "2026-08-01",
      }),
      makeTask({ id: "completed-before", status: "done", completedAt: "2026-08-01T12:00:00.000Z" }),
      makeTask({ id: "in-progress", status: "in_progress", dueDate: "2026-08-06" }),
      makeTask({ id: "due-today", dueDate: "2026-08-02" }),
      makeTask({ id: "overdue", dueDate: "2026-08-01" }),
      makeTask({ id: "done-due-today", status: "done", dueDate: "2026-08-02" }),
    ];

    const stats = buildDashboardStats(tasks, { range: "today", referenceDate });

    expect(stats.todayPace).toEqual({
      completedCount: 1,
      inProgressCount: 1,
      dueTodayCount: 1,
      overdueCount: 1,
    });
  });

  it("keeps today pace independent from the selected dashboard activity range", () => {
    const referenceDate = new Date(2026, 7, 2, 10, 0, 0);
    const tasks = [
      makeTask({ id: "today-completed", status: "done", completedAt: "2026-08-02T08:00:00.000Z" }),
      makeTask({
        id: "older-in-progress",
        status: "in_progress",
        dueDate: "2026-08-10",
        createdAt: "2026-07-20T08:00:00.000Z",
      }),
    ];

    const stats = buildDashboardStats(tasks, { range: "today", referenceDate });

    expect(stats.totalCount).toBe(1);
    expect(stats.todayPace.completedCount).toBe(1);
    expect(stats.todayPace.inProgressCount).toBe(1);
  });
});
