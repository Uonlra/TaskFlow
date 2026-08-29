import { describe, expect, it } from "vitest";

import type { Task } from "@/features/tasks/types/task.types";
import { buildCalendarTaskSummaries } from "@/features/calendar/utils/calendar-task-summary";

function task(input: Pick<Task, "id" | "status" | "dueDate">): Task {
  return {
    id: input.id,
    title: input.id,
    description: "",
    status: input.status,
    priority: "medium",
    tags: [],
    dueDate: input.dueDate,
    createdAt: "2026-08-01T00:00:00.000Z",
  };
}

describe("buildCalendarTaskSummaries", () => {
  it("按截止日期聚合任务状态和总数", () => {
    const summaries = buildCalendarTaskSummaries(
      [
        task({ id: "done", status: "done", dueDate: "2026-08-10" }),
        task({ id: "progress", status: "in_progress", dueDate: "2026-08-10" }),
        task({ id: "todo", status: "todo", dueDate: "2026-08-10" }),
        task({ id: "other-day", status: "todo", dueDate: "2026-08-11" }),
      ],
      new Date(2026, 7, 9),
    );

    expect(summaries["2026-08-10"]).toMatchObject({
      total: 3,
      done: 1,
      inProgress: 1,
      todo: 1,
      overdue: 0,
      statusDots: ["in_progress", "todo", "done"],
    });
    expect(summaries["2026-08-11"].total).toBe(1);
  });

  it("只把截止日在今天之前的未完成任务计为逾期", () => {
    const summaries = buildCalendarTaskSummaries(
      [
        task({ id: "overdue", status: "todo", dueDate: "2026-08-08" }),
        task({ id: "completed", status: "done", dueDate: "2026-08-08" }),
        task({ id: "today", status: "todo", dueDate: "2026-08-09" }),
      ],
      new Date(2026, 7, 9),
    );

    expect(summaries["2026-08-08"]).toMatchObject({ overdue: 1, statusDots: ["overdue", "todo", "done"] });
    expect(summaries["2026-08-09"].overdue).toBe(0);
  });

  it("忽略没有有效截止日期的任务，并限制状态点为三个", () => {
    const summaries = buildCalendarTaskSummaries(
      [
        task({ id: "invalid", status: "todo", dueDate: "invalid" }),
        task({ id: "overdue-progress", status: "in_progress", dueDate: "2026-08-08" }),
        task({ id: "overdue-todo", status: "todo", dueDate: "2026-08-08" }),
        task({ id: "done", status: "done", dueDate: "2026-08-08" }),
      ],
      new Date(2026, 7, 9),
    );

    expect(Object.keys(summaries)).toEqual(["2026-08-08"]);
    expect(summaries["2026-08-08"].statusDots).toEqual(["overdue", "in_progress", "todo"]);
  });
});
