import { describe, expect, it } from "vitest";

import { getTaskPage } from "@/features/tasks/utils/task-list-query";
import type { Task } from "@/features/tasks/types/task.types";
import type { TaskFilters } from "@/features/tasks/types/task-filters";

const filters: TaskFilters = {
  query: "",
  tag: "",
  status: "all",
  priority: "all",
  due: "",
  risk: "",
  date: "",
  range: "",
  sort: "created_desc",
};

const task = (id: string, title: string, status: Task["status"] = "todo"): Task => ({
  id,
  title,
  description: "",
  status,
  priority: "medium",
  tags: [],
  createdAt: `2026-08-0${id}T00:00:00.000Z`,
});

describe("task-list-query", () => {
  it("在服务端筛选后按页返回任务和元数据", () => {
    const result = getTaskPage([task("1", "Alpha"), task("2", "Beta", "done"), task("3", "Gamma")], {
      ...filters,
      query: "beta",
    }, 1, 1);

    expect(result.tasks.map((item) => item.id)).toEqual(["2"]);
    expect(result.total).toBe(1);
    expect(result.categoryCounts).toMatchObject({ all: 3, active: 2, done: 1 });
    expect(result.hasNext).toBe(false);
  });

  it("页码超过范围时回退到最后一页", () => {
    const result = getTaskPage([task("1", "Alpha"), task("2", "Beta")], filters, 9, 1);

    expect(result.page).toBe(2);
    expect(result.tasks.map((item) => item.id)).toEqual(["1"]);
  });
});
