import { taskSchema, type TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";

const TASK_EXPORT_FORMAT = "taskflow-task-export";
const TASK_EXPORT_VERSION = 1;
const LEGACY_TASK_EXPORT_SOURCE = "U's Task";

type TaskExportPayload = {
  format: typeof TASK_EXPORT_FORMAT;
  version: typeof TASK_EXPORT_VERSION;
  exportedAt: string;
  tasks: TaskFormValues[];
};

type LegacyTaskExportPayload = {
  source: typeof LEGACY_TASK_EXPORT_SOURCE;
  version: typeof TASK_EXPORT_VERSION;
  exportedAt: string;
  tasks: unknown[];
};

export class PartialTaskImportError extends Error {
  constructor(
    public readonly importedCount: number,
    public readonly totalCount: number,
    failedTaskTitle: string,
    cause: unknown,
  ) {
    const reason = cause instanceof Error ? cause.message : "请稍后重试。";
    super(
      `已导入 ${importedCount}/${totalCount} 项；第 ${importedCount + 1} 项“${failedTaskTitle}”失败：${reason} 请只重试未导入的任务，避免重复。`,
    );
    this.name = "PartialTaskImportError";
  }
}

export function createTaskExportPayload(tasks: Task[]): TaskExportPayload {
  return {
    format: TASK_EXPORT_FORMAT,
    version: TASK_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    tasks: tasks.map((task) => ({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      tags: task.tags.join(", "),
      dueDate: task.dueDate ?? "",
    })),
  };
}

export function parseTaskImportPayload(input: unknown): TaskFormValues[] {
  if (!isTaskExportPayload(input) && !isLegacyTaskExportPayload(input)) {
    throw new Error("请选择由 TaskFlow 导出的任务 JSON 文件。");
  }

  if (!input.tasks.length) {
    throw new Error("导入文件中没有任务。");
  }

  const tasks = isLegacyTaskExportPayload(input)
    ? input.tasks.map((raw) => {
        if (!raw || typeof raw !== "object") return raw;
        const task = raw as Record<string, unknown>;
        return {
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          tags:
            Array.isArray(task.tags) && task.tags.every((tag) => typeof tag === "string")
              ? task.tags.join(", ")
              : task.tags,
          dueDate: task.dueDate ?? "",
        };
      })
    : input.tasks;
  const parsedTasks = taskSchema.array().safeParse(tasks);
  if (!parsedTasks.success) {
    throw new Error("导入文件中的任务字段不符合要求。");
  }

  return parsedTasks.data;
}

function isLegacyTaskExportPayload(input: unknown): input is LegacyTaskExportPayload {
  if (!input || typeof input !== "object") return false;
  const payload = input as Partial<LegacyTaskExportPayload>;
  return (
    payload.source === LEGACY_TASK_EXPORT_SOURCE &&
    payload.version === TASK_EXPORT_VERSION &&
    typeof payload.exportedAt === "string" &&
    Array.isArray(payload.tasks)
  );
}

function isTaskExportPayload(input: unknown): input is TaskExportPayload {
  if (!input || typeof input !== "object") {
    return false;
  }

  const payload = input as Partial<TaskExportPayload>;
  return (
    payload.format === TASK_EXPORT_FORMAT &&
    payload.version === TASK_EXPORT_VERSION &&
    typeof payload.exportedAt === "string" &&
    Array.isArray(payload.tasks)
  );
}
