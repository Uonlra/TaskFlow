// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DesktopTaskTable } from "@/features/tasks/components/desktop-task-table";
import type { Task } from "@/features/tasks/types/task.types";

const tasks: Task[] = [
  {
    id: "task-1",
    title: "第一项任务",
    description: "",
    status: "todo",
    priority: "high",
    tags: [],
    dueDate: "2026-08-17",
    createdAt: "2026-08-17T08:00:00.000Z",
  },
  {
    id: "task-2",
    title: "第二项任务",
    description: "",
    status: "in_progress",
    priority: "medium",
    tags: [],
    dueDate: "2026-08-18",
    createdAt: "2026-08-17T08:00:00.000Z",
  },
  {
    id: "task-3",
    title: "第三项任务",
    description: "",
    status: "done",
    priority: "low",
    tags: [],
    dueDate: "2026-08-19",
    createdAt: "2026-08-17T08:00:00.000Z",
  },
];

describe("DesktopTaskTable", () => {
  it("将任务行放入可聚焦的滚动区域，并保存当前滚动位置", () => {
    const scrollPositionRef = { current: 0 };
    const { container, rerender } = render(
      <DesktopTaskTable
        tasks={tasks}
        emptyState={{ title: "没有任务", description: "" }}
        selectedTaskId={null}
        onSelectTask={() => {}}
        onUpdateStatus={() => {}}
        scrollPositionRef={scrollPositionRef}
      />,
    );

    const body = screen.getByRole("rowgroup", { name: "可滚动任务列表" });
    const rows = Array.from(container.querySelectorAll<HTMLElement>("[data-task-row]"));

    expect(body).toHaveAttribute("tabindex", "0");
    expect(body).toHaveAttribute("data-lenis-prevent-wheel", "true");

    Object.defineProperty(body, "scrollTop", { configurable: true, value: 70, writable: true });

    fireEvent.scroll(body);

    expect(scrollPositionRef.current).toBe(70);
    expect(rows).toHaveLength(3);

    Object.defineProperty(body, "clientHeight", { configurable: true, value: 100 });
    Object.defineProperty(body, "scrollHeight", { configurable: true, value: 400 });
    body.scrollTop = 0;

    rerender(
      <DesktopTaskTable
        tasks={[...tasks]}
        emptyState={{ title: "没有任务", description: "" }}
        selectedTaskId={null}
        onSelectTask={() => {}}
        onUpdateStatus={() => {}}
        scrollPositionRef={scrollPositionRef}
      />,
    );

    expect(body.scrollTop).toBe(70);
  });

  it.each([
    ["Enter", "{Enter}"],
    ["Space", "{" + " " + "}"],
  ])('通过 %s 激活任务行并选择任务', async (_label, key) => {
    const onSelectTask = vi.fn();
    const user = userEvent.setup();
    render(
      <DesktopTaskTable
        tasks={tasks}
        emptyState={{ title: "没有任务", description: "" }}
        selectedTaskId={null}
        onSelectTask={onSelectTask}
        onUpdateStatus={() => {}}
        scrollPositionRef={{ current: 0 }}
      />,
    );

    const firstRow = screen.getAllByRole("row")[1];
    firstRow.focus();
    await user.keyboard(key);

    expect(onSelectTask).toHaveBeenCalledWith("task-1");
    expect(firstRow).toHaveAttribute("tabindex", "0");
  });

  it("在行内操作按钮上按键时不会重复选择任务行", async () => {
    const onSelectTask = vi.fn();
    const onUpdateStatus = vi.fn();
    const user = userEvent.setup();
    render(
      <DesktopTaskTable
        tasks={tasks}
        emptyState={{ title: "没有任务", description: "" }}
        selectedTaskId={null}
        onSelectTask={onSelectTask}
        onUpdateStatus={onUpdateStatus}
        scrollPositionRef={{ current: 0 }}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "标记为完成" })[0]);

    expect(onUpdateStatus).toHaveBeenCalledWith("task-1", "done");
    expect(onSelectTask).not.toHaveBeenCalled();
  });

  it("向辅助技术暴露当前选中的任务行", () => {
    render(
      <DesktopTaskTable
        tasks={tasks}
        emptyState={{ title: "没有任务", description: "" }}
        selectedTaskId="task-2"
        onSelectTask={() => {}}
        onUpdateStatus={() => {}}
        scrollPositionRef={{ current: 0 }}
      />,
    );

    const rows = screen.getAllByRole("row");

    expect(rows[1]).toHaveAttribute("aria-selected", "false");
    expect(rows[2]).toHaveAttribute("aria-selected", "true");
  });
});
