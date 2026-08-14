import { afterEach, describe, expect, it, vi } from "vitest";

import type { Task } from "@/features/tasks/types/task.types";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import { useTaskStore } from "@/features/tasks/store/task-store";

vi.mock("@/shared/lib/appwrite/env", () => ({
    hasAppwritePublicEnv: true,
}));

const makeTask = (overrides: Partial<Task> = {}): Task => ({
    id: "task-1",
    title: "测试任务",
    description: "测试说明",
    status: "todo",
    priority: "medium",
    tags: [],
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    ...overrides,
});

const formValues: TaskFormValues = {
    title: "新任务",
    description: "新任务说明",
    status: "todo",
    priority: "high",
    tags: "测试，学习",
    dueDate: "",
};

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json",
        },
    });
}

afterEach(() => {
    useTaskStore.setState({
        tasks: [],
        isLoading: false,
        error: null,
        lastLoadedUserId: null,
    });

    vi.restoreAllMocks();
});

describe("task store", () => {
    it("syncTasks 获取任务后写入 store，并规范化 tags", async () => {
        vi.spyOn(global, "fetch").mockResolvedValue(
            jsonResponse({
                tasks: [
                    makeTask({
                        id: "remote-task",
                        tags: null as unknown as string[],
                    }),
                ],
            }),
        );

        await useTaskStore.getState().syncTasks("user-1");

        const state = useTaskStore.getState();

        expect(state.tasks).toEqual([
            expect.objectContaining({
                id: "remote-task",
                tags: [],
            }),
        ]);
        expect(state.lastLoadedUserId).toBe("user-1");
        expect(state.isLoading).toBe(false);
    });

    it("createTaskAsync 创建任务后将任务放到 store 开头", async () => {
        const createdTask = makeTask({
            id: "created-task",
            title: "新任务",
            tags: ["测试", "学习"],
        });

        const fetchMock = vi
            .spyOn(global, "fetch")
            .mockResolvedValue(jsonResponse({ task: createdTask }, 201));

        const taskId = await useTaskStore
            .getState()
            .createTaskAsync(formValues, "user-1");

        expect(taskId).toBe("created-task");
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/tasks",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify(formValues),
            }),
        );
        expect(useTaskStore.getState().tasks[0]).toEqual(createdTask);
    });

    it("deleteTask 删除远程任务后从 store 移除", async () => {
        useTaskStore.setState({
            tasks: [
                makeTask({ id: "task-to-delete" }),
                makeTask({ id: "task-to-keep" }),
            ],
        });

        const fetchMock = vi
            .spyOn(global, "fetch")
            .mockResolvedValue(jsonResponse({ ok: true }));

        await useTaskStore
            .getState()
            .deleteTask("task-to-delete", "user-1");

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/tasks/task-to-delete",
            expect.objectContaining({
                method: "DELETE",
            }),
        );

        expect(useTaskStore.getState().tasks).toEqual([
            expect.objectContaining({
                id: "task-to-keep",
            }),
        ]);
    });
});