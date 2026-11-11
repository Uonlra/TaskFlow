import { describe, expect, it } from "vitest";

import { createTaskExportPayload, parseTaskImportPayload } from "@/features/tasks/utils/task-transfer";
import type { Task } from "@/features/tasks/types/task.types";
import { executeTaskEvolution, restoreTaskEvolution } from "@/features/tasks/domain/task-evolution-storage";

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
  it("新版备份保留演进记录，恢复时关联新任务，篡改历史的文件无法导入", () => {
    const task = executeTaskEvolution(
      tasks[0],
      { operationId: "b", expectedRevision: 0, action: { type: "create_branch", title: "A", question: "有效吗？" } },
      "2026-11-10T00:00:00.000Z",
    );
    const payload = createTaskExportPayload([task]);
    expect(payload.version).toBe(2);
    const restored = parseTaskImportPayload(JSON.parse(JSON.stringify(payload)))[0];
    expect(restoreTaskEvolution(restored.evolution, "new").events[1]).toEqual(task.evolution!.events[1]);
    restored.evolution!.goal.objective = "伪造目标";
    expect(() => parseTaskImportPayload({ ...payload, tasks: [restored] })).toThrow("不一致");
  });
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
    expect(parseTaskImportPayload(JSON.parse(JSON.stringify(payload)))).toEqual(payload.tasks);
  });

  it("仍能导入旧版列表页生成的任务备份", () => {
    const legacy = JSON.parse(
      JSON.stringify({
        source: "U's Task",
        version: 1,
        exportedAt: "2026-08-17T10:00:00.000Z",
        tasks,
      }),
    );
    expect(parseTaskImportPayload(legacy)).toEqual(createTaskExportPayload(tasks).tasks);
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
    expect(() =>
      parseTaskImportPayload({
        source: "U's Task",
        version: 1,
        exportedAt: "2026-08-17T10:00:00.000Z",
        tasks: [null],
      }),
    ).toThrow("任务字段");
    expect(() =>
      parseTaskImportPayload({
        source: "U's Task",
        version: 1,
        exportedAt: "2026-08-17T10:00:00.000Z",
        tasks: [{ ...tasks[0], tags: [23] }],
      }),
    ).toThrow("任务字段");
  });
});
