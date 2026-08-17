import { taskSchema, type TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";

const TASK_EXPORT_FORMAT = "taskflow-task-export";
const TASK_EXPORT_VERSION = 1;

type TaskExportPayload = {
  format: typeof TASK_EXPORT_FORMAT;
  version: typeof TASK_EXPORT_VERSION;
  exportedAt: string;
  tasks: TaskFormValues[];
};

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
  if (!isTaskExportPayload(input)) {
    throw new Error("请选择由 TaskFlow 导出的任务 JSON 文件。");
  }

  if (!input.tasks.length) {
    throw new Error("导入文件中没有任务。");
  }

  const parsedTasks = taskSchema.array().safeParse(input.tasks);
  if (!parsedTasks.success) {
    throw new Error("导入文件中的任务字段不符合要求。");
  }

  return parsedTasks.data;
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
