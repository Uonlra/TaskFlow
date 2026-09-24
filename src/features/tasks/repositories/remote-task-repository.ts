import type { TaskRepository } from "@/features/tasks/repositories/task-repository";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

export class RemoteTaskRepository implements TaskRepository {
  async list(): Promise<Task[]> {
    const payload = await request<{ tasks: Task[] }>("/api/tasks");
    return payload.tasks ?? [];
  }

  async get(id: string): Promise<Task | null> {
    const response = await fetch(taskPath(id), { method: "GET" });

    if (response.status === 404) return null;

    const payload = await readResponse<{ task: Task }>(response);
    return payload.task;
  }

  async create(input: TaskFormValues): Promise<Task> {
    const payload = await request<{ task: Task }>("/api/tasks", {
      method: "POST",
      body: input,
    });
    return payload.task;
  }

  async update(id: string, input: TaskFormValues): Promise<Task> {
    const payload = await request<{ task: Task }>(taskPath(id), {
      method: "PATCH",
      body: input,
    });
    return payload.task;
  }

  async updateStatus(id: string, status: Task["status"]): Promise<Task> {
    const payload = await request<{ task: Task }>(taskPath(id), {
      method: "PATCH",
      body: { status },
    });
    return payload.task;
  }

  async delete(id: string): Promise<void> {
    await request(taskPath(id), { method: "DELETE" });
  }
}

export const remoteTaskRepository = new RemoteTaskRepository();

function taskPath(id: string) {
  return `/api/tasks/${encodeURIComponent(id)}`;
}

async function request<T = unknown>(input: RequestInfo | URL, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(input, {
    method: options.method ?? "GET",
    headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  return readResponse<T>(response);
}

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message || "请求失败，请稍后再试。");
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
