import { describe, expect, it } from "vitest";

import { createTaskExportPayload, parseTaskImportPayload } from "@/features/tasks/utils/task-transfer";
import type { Task } from "@/features/tasks/types/task.types";

const tasks: Task[] = [
  {
    id: "task-1",
    title: "整理任务备份",
    description: "导出后重新导入",
    status: "in_progress",
    priority: "high",
    tags: ["工作", "重要"],
    dueDate: "2026-08-20",
    createdAt: "2026-08-17T08:00:00.000Z",
    updatedAt: "2026-08-17T09:00:00.000Z",
  },
];

describe("task transfer", () => {
  it("导出可移植的任务字段，并能重新导入", () => {
    const payload = createTaskExportPayload(tasks);

    expect(payload).toMatchObject({
      format: "taskflow-task-export",
      version: 1,
      tasks: [
        {
          title: "整理任务备份",
          tags: "工作, 重要",
          dueDate: "2026-08-20",
        },
      ],
    });
    expect(payload.tasks[0]).not.toHaveProperty("id");
    expect(parseTaskImportPayload(payload)).toEqual(payload.tasks);
  });

  it("拒绝非 TaskFlow 文件和不完整任务", () => {
    expect(() => parseTaskImportPayload({ tasks: [] })).toThrow("TaskFlow");
    expect(() =>
      parseTaskImportPayload({
        format: "taskflow-task-export",
        version: 1,
        exportedAt: "2026-08-17T08:00:00.000Z",
        tasks: [{ title: "" }],
      }),
    ).toThrow("任务字段");
  });
});
