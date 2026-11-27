// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CalendarDayAgenda } from "@/features/calendar/components/calendar-day-agenda";
import { buildCalendarTaskSummaries } from "@/features/calendar/utils/calendar-task-summary";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";

vi.mock("@/features/tasks/components/task-form-dialog", () => ({
  TaskFormDialog: ({
    createDefaults,
    onSubmitTask,
  }: {
    createDefaults: Partial<TaskFormValues>;
    onSubmitTask: (values: TaskFormValues) => void | Promise<void>;
  }) => (
    <button
      type="button"
      onClick={() =>
        onSubmitTask({
          title: "新的任务",
          description: "",
          status: "todo",
          priority: "medium",
          tags: "",
          dueDate: createDefaults.dueDate,
        })
      }
    >
      创建任务
    </button>
  ),
}));

const dateParam = "2026-08-29";
const tasks: Task[] = [
  {
    id: "task-1",
    title: "完成月度复盘",
    description: "",
    status: "done",
    priority: "high",
    tags: [],
    dueDate: dateParam,
    createdAt: "2026-08-20T08:00:00.000Z",
  },
  {
    id: "task-2",
    title: "整理交互说明",
    description: "",
    status: "in_progress",
    priority: "medium",
    tags: [],
    dueDate: dateParam,
    createdAt: "2026-08-21T08:00:00.000Z",
  },
];

function renderAgenda(dayTasks: Task[], isLoading = false) {
  const onPreviewTask = vi.fn();
  const onCreateTask = vi.fn();
  const summary = buildCalendarTaskSummaries(dayTasks)[dateParam] ?? {
    total: 0,
    done: 0,
    inProgress: 0,
    todo: 0,
    overdue: 0,
    statusDots: [],
  };
  render(
    <CalendarDayAgenda
      date={new Date(2026, 7, 29)}
      dateParam={dateParam}
      tasks={dayTasks}
      summary={summary}
      isLoading={isLoading}
      onCreateTask={onCreateTask}
      onPreviewTask={onPreviewTask}
    />,
  );
  return { onCreateTask, onPreviewTask, agenda: screen.getByRole("region", { name: "选中日安排" }) };
}

describe("CalendarDayAgenda", () => {
  it("在同一处显示当天任务和总数，并让任务可直接打开速览", async () => {
    const { onPreviewTask, agenda } = renderAgenda(tasks);
    expect(within(agenda).getByRole("heading", { name: /8月29日.*星期六/ })).toBeInTheDocument();
    expect(within(agenda).getByText("共 2 项 · 已完成 1 项")).toBeInTheDocument();
    expect(within(agenda).getAllByRole("listitem")).toHaveLength(2);
    expect(within(agenda).getByRole("link", { name: "在任务页查看" })).toHaveAttribute(
      "href",
      `/tasks?date=${dateParam}`,
    );

    await userEvent.click(within(agenda).getByRole("button", { name: /整理交互说明/ }));
    expect(onPreviewTask).toHaveBeenCalledWith(tasks[1]);
  });

  it("空日期可以创建任务并带入选中日期", async () => {
    const { onCreateTask, agenda } = renderAgenda([]);
    expect(within(agenda).getByText("这一天还没有任务。")).toBeInTheDocument();
    await userEvent.click(within(agenda).getByRole("button", { name: "创建任务" }));
    expect(onCreateTask).toHaveBeenCalledWith(expect.objectContaining({ dueDate: dateParam }));
  });

  it("同步期间不把尚未加载的日期展示为空日期", () => {
    const { agenda } = renderAgenda([], true);
    expect(within(agenda).getByText("正在同步任务…")).toBeInTheDocument();
    expect(within(agenda).queryByText("这一天还没有任务。")).not.toBeInTheDocument();
  });
});
