// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CalendarDayDrawer } from "@/features/calendar/components/calendar-day-drawer";
import type { CalendarDaySummary } from "@/features/calendar/utils/calendar-task-summary";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";

vi.mock("@/features/tasks/components/task-form-dialog", () => ({
  TaskFormDialog: ({
    createDefaults,
    onSubmitTask,
  }: {
    createDefaults?: Partial<TaskFormValues>;
    onSubmitTask: (values: TaskFormValues) => void | Promise<void>;
  }) => (
    <button
      type="button"
      data-testid="drawer-create-task"
      data-due-date={createDefaults?.dueDate}
      onClick={() =>
        onSubmitTask({
          title: "抽屉新任务",
          description: "",
          status: "todo",
          priority: "medium",
          tags: "",
          dueDate: createDefaults?.dueDate,
        })
      }
    >
      创建任务
    </button>
  ),
}));

const tasks: Task[] = [
  {
    id: "task-1",
    title: "完成月度复盘",
    description: "",
    status: "done",
    priority: "high",
    tags: [],
    dueDate: "2026-08-29",
    createdAt: "2026-08-20T08:00:00.000Z",
  },
  {
    id: "task-2",
    title: "整理交互说明",
    description: "",
    status: "in_progress",
    priority: "medium",
    tags: [],
    dueDate: "2026-08-29",
    createdAt: "2026-08-21T08:00:00.000Z",
  },
];

const summary: CalendarDaySummary = {
  total: 3,
  done: 1,
  inProgress: 1,
  todo: 1,
  overdue: 0,
  statusDots: ["in_progress", "todo", "done"],
};

describe("CalendarDayDrawer", () => {
  it("显示日期、完成环、状态数量与当天任务", async () => {
    render(
      <CalendarDayDrawer
        open
        dateParam="2026-08-29"
        tasks={tasks}
        summary={summary}
        isLoading={false}
        onClose={() => {}}
        onCreateTask={() => {}}
        onPreviewTask={() => {}}
      />,
    );

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /2026年8月29日.*星期六/ })).toBeInTheDocument();
    expect(screen.getByText("已完成 1 / 共 3 项")).toBeInTheDocument();
    expect(screen.getByText("完成月度复盘")).toBeInTheDocument();
    expect(screen.getByText("整理交互说明")).toBeInTheDocument();
    expect(document.querySelector(".calendar-progress-ring")).toHaveStyle({
      "--calendar-ring-done": "120deg",
      "--calendar-ring-progress": "240deg",
    });
  });

  it("无任务时显示空状态", async () => {
    render(
      <CalendarDayDrawer
        open
        dateParam="2026-08-29"
        tasks={[]}
        summary={{ total: 0, done: 0, inProgress: 0, todo: 0, overdue: 0, statusDots: [] }}
        isLoading={false}
        onClose={() => {}}
        onCreateTask={() => {}}
        onPreviewTask={() => {}}
      />,
    );

    expect(await screen.findByText("这一天还没有任务。")).toBeInTheDocument();
    expect(screen.getByText("暂无任务")).toBeInTheDocument();
  });

  it("点击当天任务时打开任务速览", async () => {
    const onPreviewTask = vi.fn();
    const user = userEvent.setup();
    render(
      <CalendarDayDrawer
        open
        dateParam="2026-08-29"
        tasks={tasks}
        summary={summary}
        isLoading={false}
        onClose={() => {}}
        onCreateTask={() => {}}
        onPreviewTask={onPreviewTask}
      />,
    );

    await user.click(await screen.findByRole("button", { name: /整理交互说明/ }));
    expect(onPreviewTask).toHaveBeenCalledWith(tasks[1]);
  });

  it("支持关闭按钮与点击遮罩关闭", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { unmount } = render(
      <CalendarDayDrawer
        open
        dateParam="2026-08-29"
        tasks={[]}
        summary={{ total: 0, done: 0, inProgress: 0, todo: 0, overdue: 0, statusDots: [] }}
        isLoading={false}
        onClose={onClose}
        onCreateTask={() => {}}
        onPreviewTask={() => {}}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "关闭日期详情" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    const overlay = document.querySelector(".calendar-drawer-overlay");
    expect(overlay).not.toBeNull();
    fireEvent.mouseDown(overlay as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(2);
    unmount();
  });

  it("抽屉内创建任务会携带选中日期", async () => {
    const onCreateTask = vi.fn();
    const user = userEvent.setup();
    render(
      <CalendarDayDrawer
        open
        dateParam="2026-08-29"
        tasks={[]}
        summary={{ total: 0, done: 0, inProgress: 0, todo: 0, overdue: 0, statusDots: [] }}
        isLoading={false}
        onClose={() => {}}
        onCreateTask={onCreateTask}
        onPreviewTask={() => {}}
      />,
    );

    const createButton = await screen.findByTestId("drawer-create-task");
    expect(createButton).toHaveAttribute("data-due-date", "2026-08-29");
    await user.click(createButton);

    await waitFor(() => {
      expect(onCreateTask).toHaveBeenCalledWith(expect.objectContaining({ dueDate: "2026-08-29" }));
    });
  });
});
