import { describe, expect, it } from "vitest";

import type { Task } from "@/features/tasks/types/task.types";
import { getAuthPreviewWeek } from "@/features/auth/utils/auth-preview-week";

const baseTask: Task = {
  id: "task",
  title: "任务",
  description: "",
  status: "todo",
  priority: "medium",
  tags: [],
  createdAt: "2026-08-01T00:00:00.000Z",
};

describe("getAuthPreviewWeek", () => {
  it("builds a Monday-to-Sunday week and marks today", () => {
    const week = getAuthPreviewWeek([], new Date(2026, 7, 19));

    expect(week.map((day) => day.weekday)).toEqual(["一", "二", "三", "四", "五", "六", "日"]);
    expect(week[0].key).toBe("2026-08-17");
    expect(week[2].isToday).toBe(true);
    expect(week[6].key).toBe("2026-08-23");
  });

  it("counts due tasks and marks active overdue tasks", () => {
    const week = getAuthPreviewWeek(
      [
        { ...baseTask, id: "overdue", dueDate: "2026-08-17" },
        { ...baseTask, id: "done", status: "done", dueDate: "2026-08-17" },
        { ...baseTask, id: "today", dueDate: "2026-08-19" },
      ],
      new Date(2026, 7, 19),
    );

    expect(week[0]).toMatchObject({ taskCount: 2, hasOverdue: true });
    expect(week[2]).toMatchObject({ taskCount: 1, hasOverdue: false });
  });
});
