import { describe, expect, it } from "vitest";

import { buildTasksHref } from "@/shared/lib/constants/query-params";

describe("buildTasksHref", () => {
  it("省略任务页的默认状态与排序", () => {
    expect(buildTasksHref({ status: "active", sort: "created_asc" })).toBe("/tasks");
  });

  it("在 URL 中保留显式的全部状态", () => {
    expect(buildTasksHref({ status: "all" })).toBe("/tasks?status=all");
  });
});
