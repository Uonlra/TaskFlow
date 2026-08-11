import { afterEach, describe, expect, it, vi } from "vitest";

import type { Task } from "@/features/tasks/types/task.types";
import {
  addTaskDays,
  filterTasksByTaskDateRange,
  formatTaskDateParam,
  getTaskWeekEnd,
  getTaskWeekStart,
  hasActiveTaskDateRangeFilter,
  hasTaskDueDate,
  isTaskDueInRange,
  isTaskDueInWeek,
  isTaskDueOnDate,
  parseTaskDateParam,
  parseTaskDueDate,
  startOfTaskDay,
} from "@/features/tasks/utils/task-date-filters";
import { DASHBOARD_RANGE_VALUES } from "@/shared/lib/constants/query-params";
import { matchesTaskDueFilter } from "@/features/tasks/utils/task-deadline";

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "task-1",
  title: "测试任务",
  description: "",
  status: "todo",
  priority: "medium",
  tags: [],
  dueDate: "2026-07-09",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  ...overrides,
});

afterEach(() => {
  vi.useRealTimers();
});

describe("task date filters", () => {
  describe("parseTaskDateParam", () => {
    it("parses valid YYYY-MM-DD dates as local dates", () => {
      const date = parseTaskDateParam("2026-07-09");

      expect(date).toBeInstanceOf(Date);
      expect(formatTaskDateParam(date as Date)).toBe("2026-07-09");
    });

    it("rejects invalid or non-padded date params", () => {
      expect(parseTaskDateParam("2026-02-29")).toBeNull();
      expect(parseTaskDateParam("2026-13-01")).toBeNull();
      expect(parseTaskDateParam("2026-00-01")).toBeNull();
      expect(parseTaskDateParam("2026-07-32")).toBeNull();
      expect(parseTaskDateParam("2026-7-9")).toBeNull();
      expect(parseTaskDateParam("")).toBeNull();
      expect(parseTaskDateParam(null)).toBeNull();
      expect(parseTaskDateParam(undefined)).toBeNull();
    });

    it("accepts leap-year dates", () => {
      expect(formatTaskDateParam(parseTaskDateParam("2024-02-29") as Date)).toBe("2024-02-29");
    });
  });

  describe("date formatting and day math", () => {
    it("formats local dates with zero-padded month and day", () => {
      expect(formatTaskDateParam(new Date(2026, 6, 9))).toBe("2026-07-09");
      expect(formatTaskDateParam(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    });

    it("returns a new start-of-day date without mutating the original", () => {
      const original = new Date(2026, 6, 9, 13, 45, 20, 123);
      const result = startOfTaskDay(original);

      expect(result).not.toBe(original);
      expect(formatTaskDateParam(result)).toBe("2026-07-09");
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
      expect(original.getHours()).toBe(13);
      expect(original.getMinutes()).toBe(45);
    });

    it("adds and subtracts days across month boundaries without mutating input", () => {
      const original = new Date(2026, 6, 1, 12, 0, 0);

      expect(formatTaskDateParam(addTaskDays(original, 1))).toBe("2026-07-02");
      expect(formatTaskDateParam(addTaskDays(original, -1))).toBe("2026-06-30");
      expect(formatTaskDateParam(addTaskDays(new Date(2026, 6, 31), 1))).toBe("2026-08-01");
      expect(formatTaskDateParam(original)).toBe("2026-07-01");
      expect(original.getHours()).toBe(12);
    });
  });

  describe("week boundaries", () => {
    it("uses Monday as week start", () => {
      expect(formatTaskDateParam(getTaskWeekStart(new Date(2026, 6, 9)))).toBe("2026-07-06");
      expect(formatTaskDateParam(getTaskWeekStart(new Date(2026, 6, 12)))).toBe("2026-07-06");
      expect(formatTaskDateParam(getTaskWeekStart(new Date(2026, 6, 13)))).toBe("2026-07-13");
    });

    it("returns Sunday end for the same local week", () => {
      const end = getTaskWeekEnd(new Date(2026, 6, 9));

      expect(formatTaskDateParam(end)).toBe("2026-07-12");
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
      expect(end.getMilliseconds()).toBe(999);
    });
  });

  describe("task due date parsing", () => {
    it("parses date-only dueDate as a local task day", () => {
      const dueDate = parseTaskDueDate(makeTask({ dueDate: "2026-07-09" }));

      expect(formatTaskDateParam(dueDate as Date)).toBe("2026-07-09");
    });

    it("returns null for missing or invalid dueDate", () => {
      expect(parseTaskDueDate(makeTask({ dueDate: undefined }))).toBeNull();
      expect(parseTaskDueDate(makeTask({ dueDate: "not-a-date" }))).toBeNull();
    });

    it("reports whether a task has a valid due date", () => {
      expect(hasTaskDueDate(makeTask({ dueDate: "2026-07-09" }))).toBe(true);
      expect(hasTaskDueDate(makeTask({ dueDate: undefined }))).toBe(false);
      expect(hasTaskDueDate(makeTask({ dueDate: "not-a-date" }))).toBe(false);
    });
  });

  describe("task range checks", () => {
    it("matches tasks due on a specific local date", () => {
      expect(isTaskDueOnDate(makeTask({ dueDate: "2026-07-09" }), new Date(2026, 6, 9))).toBe(true);
      expect(isTaskDueOnDate(makeTask({ dueDate: "2026-07-10" }), new Date(2026, 6, 9))).toBe(false);
      expect(isTaskDueOnDate(makeTask({ dueDate: undefined }), new Date(2026, 6, 9))).toBe(false);
      expect(isTaskDueOnDate(makeTask({ status: "done", dueDate: "2026-07-09" }), new Date(2026, 6, 9))).toBe(true);
    });

    it("matches tasks due in a Monday-start week", () => {
      const anchor = new Date(2026, 6, 9);

      expect(isTaskDueInWeek(makeTask({ dueDate: "2026-07-06" }), anchor)).toBe(true);
      expect(isTaskDueInWeek(makeTask({ dueDate: "2026-07-12" }), anchor)).toBe(true);
      expect(isTaskDueInWeek(makeTask({ dueDate: "2026-07-05" }), anchor)).toBe(false);
      expect(isTaskDueInWeek(makeTask({ dueDate: "2026-07-13" }), anchor)).toBe(false);
      expect(isTaskDueInWeek(makeTask({ dueDate: undefined }), anchor)).toBe(false);
    });

    it("matches today, week, all, and inactive ranges", () => {
      const task = makeTask({ dueDate: "2026-07-09" });

      expect(isTaskDueInRange(task, { date: new Date(2026, 6, 9), range: DASHBOARD_RANGE_VALUES.today })).toBe(true);
      expect(isTaskDueInRange(task, { date: new Date(2026, 6, 8), range: DASHBOARD_RANGE_VALUES.today })).toBe(false);
      expect(isTaskDueInRange(task, { date: new Date(2026, 6, 6), range: DASHBOARD_RANGE_VALUES.week })).toBe(true);
      expect(isTaskDueInRange(task, { range: DASHBOARD_RANGE_VALUES.all })).toBe(true);
      expect(isTaskDueInRange(makeTask({ dueDate: undefined }), { range: DASHBOARD_RANGE_VALUES.all })).toBe(false);
      expect(isTaskDueInRange(task, {})).toBe(true);
    });

    it("uses current local day for today/week when no anchor date is provided", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 6, 9, 10, 0, 0));

      expect(isTaskDueInRange(makeTask({ dueDate: "2026-07-09" }), { range: DASHBOARD_RANGE_VALUES.today })).toBe(true);
      expect(isTaskDueInRange(makeTask({ dueDate: "2026-07-08" }), { range: DASHBOARD_RANGE_VALUES.today })).toBe(false);
      expect(isTaskDueInRange(makeTask({ dueDate: "2026-07-12" }), { range: DASHBOARD_RANGE_VALUES.week })).toBe(true);
    });
  });

  describe("filterTasksByTaskDateRange", () => {
    it("filters by date-only, week, and all due-date ranges", () => {
      const tasks = [
        makeTask({ id: "today", dueDate: "2026-07-09" }),
        makeTask({ id: "week", dueDate: "2026-07-12" }),
        makeTask({ id: "next", dueDate: "2026-07-13" }),
        makeTask({ id: "none", dueDate: undefined }),
      ];

      expect(filterTasksByTaskDateRange(tasks, { date: new Date(2026, 6, 9) }).map((task) => task.id)).toEqual(["today"]);
      expect(filterTasksByTaskDateRange(tasks, { date: new Date(2026, 6, 9), range: DASHBOARD_RANGE_VALUES.week }).map((task) => task.id)).toEqual(["today", "week"]);
      expect(filterTasksByTaskDateRange(tasks, { range: DASHBOARD_RANGE_VALUES.all }).map((task) => task.id)).toEqual(["today", "week", "next"]);
      expect(filterTasksByTaskDateRange(tasks, {}).map((task) => task.id)).toEqual(["today", "week", "next", "none"]);
      expect(tasks.map((task) => task.id)).toEqual(["today", "week", "next", "none"]);
    });
  });

  describe("hasActiveTaskDateRangeFilter", () => {
    it("detects active date and supported range filters", () => {
      expect(hasActiveTaskDateRangeFilter({ date: new Date(2026, 6, 9) })).toBe(true);
      expect(hasActiveTaskDateRangeFilter({ range: DASHBOARD_RANGE_VALUES.today })).toBe(true);
      expect(hasActiveTaskDateRangeFilter({ range: DASHBOARD_RANGE_VALUES.week })).toBe(true);
      expect(hasActiveTaskDateRangeFilter({ range: DASHBOARD_RANGE_VALUES.all })).toBe(true);
      expect(hasActiveTaskDateRangeFilter({})).toBe(false);
      expect(hasActiveTaskDateRangeFilter({ range: "invalid" })).toBe(false);
    });
  });

  describe("matchesTaskDueFilter", () => {
    it("matches the same active-task deadline buckets used by the task page", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 6, 9, 10, 0, 0));

      expect(matchesTaskDueFilter(makeTask({ dueDate: "2026-07-09" }), "today")).toBe(true);
      expect(matchesTaskDueFilter(makeTask({ dueDate: "2026-07-10" }), "near")).toBe(true);
      expect(matchesTaskDueFilter(makeTask({ dueDate: "2026-07-13" }), "upcoming")).toBe(false);
      expect(matchesTaskDueFilter(makeTask({ dueDate: "2026-07-08" }), "overdue")).toBe(true);
      expect(matchesTaskDueFilter(makeTask({ status: "done", dueDate: "2026-07-08" }), "overdue")).toBe(false);
    });
  });
});
