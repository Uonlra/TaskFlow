import { afterEach, describe, expect, it, vi } from "vitest";

import type { Task } from "@/features/tasks/types/task.types";
import { getTaskDueMeta, sortTasks } from "@/features/tasks/utils/task-deadline";

const makeTask = (overrides: Partial<Task> = {}): Task => ({
    id: "task-1",
    title: "测试任务",
    description: "",
    status: "todo",
    priority: "medium",
    tags: [],
    dueDate: "2026-08-13",
    createdAt: "2026-08-01T10:00:00.000Z",
    ...overrides,
});

afterEach(() => {
    vi.useRealTimers();
});

describe("getTaskDueMeta", () => {
    it("marks an overdue task as overdue with a danger tone", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 7, 13, 10, 0, 0));

        const result = getTaskDueMeta(makeTask({ dueDate: "2026-08-10" }));

        expect(result.isOverdue).toBe(true);
        expect(result.tone).toBe("danger");
        expect(result.label).toBe("已逾期 3 天");
    });

    it("marks a task due today with a warning tone", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 7, 13, 10, 0, 0));

        const result = getTaskDueMeta(makeTask({ dueDate: "2026-08-13" }));

        expect(result.isDueToday).toBe(true);
        expect(result.tone).toBe("warning");
        expect(result.label).toBe("今天到期");
    });

    it("marks a task due in three days as upcoming with a success tone", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 7, 13, 10, 0, 0));

        const result = getTaskDueMeta(makeTask({ dueDate: "2026-08-16" }));

        expect(result.isUpcoming).toBe(true);
        expect(result.tone).toBe("success");
        expect(result.label).toBe("3 天后到期");
    });

    it("does not mark a completed task as overdue", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 7, 13, 10, 0, 0));

        const result = getTaskDueMeta(
            makeTask({ status: "done", dueDate: "2026-08-10" }),
        );

        expect(result.isOverdue).toBe(false);
        expect(result.tone).toBe("success");
    });

    it("treats a task without a due date as muted", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 7, 13, 10, 0, 0));

        const result = getTaskDueMeta(makeTask({ dueDate: undefined }));

        expect(result.tone).toBe("muted");
        expect(result.label).toBe("未设置截止日期");
    });
});

describe("sortTasks", () => {
    it("sorts by due date ascending, putting overdue tasks first", () => {
        const tasks = [
            makeTask({ id: "done", status: "done" }),
            makeTask({ id: "today", dueDate: "2026-08-13" }),
            makeTask({ id: "overdue", dueDate: "2026-08-10" }),
        ];

        const sorted = sortTasks(tasks, "due_asc").map((task) => task.id);

        expect(sorted).toEqual(["overdue", "today", "done"]);
    });

    it("sorts by priority descending", () => {
        const tasks = [
            makeTask({ id: "low", priority: "low" }),
            makeTask({ id: "high", priority: "high" }),
            makeTask({ id: "medium", priority: "medium" }),
        ];

        const sorted = sortTasks(tasks, "priority_desc").map((task) => task.id);

        expect(sorted).toEqual(["high", "medium", "low"]);
    });
});