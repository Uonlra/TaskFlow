// @vitest-environment jsdom

import { act, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskQuickViewDialog } from "@/features/tasks/components/task-quick-view-dialog";
import { initializeTaskEvolution } from "@/features/tasks/domain/task-evolution";
import { graphFixture, graphCommand } from "../../../../test/fixtures/task-evolution";
import { executeTaskEvolution } from "@/features/tasks/domain/task-evolution-storage";

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const task = {
  id: "task-1",
  title: "整理项目方案",
  description: "确认任务查看弹窗的内容和操作。",
  status: "in_progress" as const,
  priority: "high" as const,
  tags: ["设计"],
  dueDate: "2026-08-29",
  createdAt: "2026-08-24T08:00:00.000Z",
};

describe("TaskQuickViewDialog", () => {
  it("keeps a failed progress draft and retry id, then updates history without waiting for old preview props", async () => {
    const user = userEvent.setup();
    const execute = vi
      .fn()
      .mockRejectedValueOnce(new Error("保存失败，稍后重试"))
      .mockImplementation((current, command) =>
        Promise.resolve(executeTaskEvolution(current, command, "2026-11-11T00:00:00.000Z")),
      );
    render(
      <TaskQuickViewDialog
        task={task}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleComplete={vi.fn()}
        onExecuteEvolution={execute}
      />,
    );
    await user.click(screen.getByRole("button", { name: "记录进展" }));
    await user.type(screen.getByRole("textbox", { name: "进展内容" }), "完成一次验证");
    await user.click(screen.getByRole("button", { name: "保存记录" }));
    expect(screen.getByRole("alert")).toHaveTextContent("保存失败");
    expect(screen.getByRole("textbox", { name: "进展内容" })).toHaveValue("完成一次验证");
    await user.click(screen.getByRole("button", { name: "保存记录" }));
    expect(await screen.findByRole("status")).toHaveTextContent("进展已保存");
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("heading", { name: "演进记录" })).toBeInTheDocument();
    expect(execute.mock.calls[0][1].operationId).toBe(execute.mock.calls[1][1].operationId);
  });
  it("loads full history before enabling changes and ignores an old task's late response", async () => {
    let resolve!: (value: typeof task) => void;
    const load = vi.fn().mockReturnValue(
      new Promise<typeof task>((done) => {
        resolve = done;
      }),
    );
    const props = { onClose: vi.fn(), onEdit: vi.fn(), onToggleComplete: vi.fn(), onDelete: vi.fn(), onLoadTask: load };
    const view = render(<TaskQuickViewDialog {...props} task={task} />);
    expect(screen.getByRole("status")).toHaveTextContent("正在读取");
    expect(screen.queryByRole("button", { name: "标记为完成" })).not.toBeInTheDocument();
    load.mockResolvedValue({ ...task, id: "new", title: "另一个任务" });
    view.rerender(<TaskQuickViewDialog {...props} task={{ ...task, id: "new", title: "另一个任务" }} />);
    await screen.findByRole("button", { name: "标记为完成" });
    await act(async () => resolve(task));
    expect(screen.getByRole("dialog", { name: "另一个任务" })).toBeInTheDocument();
  });
  it("shows one decision, five key nodes, and lets Escape close node details before the preview", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const state = graphCommand(graphFixture(), "note", { type: "record_progress", note: "普通进展" });
    render(
      <TaskQuickViewDialog
        task={{ ...task, evolution: state }}
        onClose={onClose}
        onEdit={vi.fn()}
        onToggleComplete={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByRole("link", { name: /成果待采纳/ })).toHaveAttribute(
      "href",
      expect.stringContaining("result=ra2"),
    );
    expect(document.querySelectorAll(".task-evolution-graph-row")).toHaveLength(5);
    await user.click(screen.getByRole("button", { name: /撤回采纳 主线/ }));
    const details = screen.getByRole("region", { name: "节点详情" });
    expect(within(details).getByRole("link", { name: "在详情中查看" })).toHaveAttribute(
      "href",
      expect.stringContaining("event=w2"),
    );
    await user.click(within(details).getByRole("heading"));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("region", { name: "节点详情" })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
  it("restores the opener's focus when closing the preview", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>查看任务</button>
          <TaskQuickViewDialog
            task={open ? task : null}
            onClose={() => setOpen(false)}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onToggleComplete={vi.fn()}
          />
        </>
      );
    }
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "查看任务" }));
    await user.click(screen.getByRole("button", { name: "关闭任务查看" }));
    expect(screen.getByRole("button", { name: "查看任务" })).toHaveFocus();
  });
  it("有演进历史时引导进入详情验收", () => {
    render(
      <TaskQuickViewDialog
        task={{ ...task, evolution: initializeTaskEvolution(task, "2026-11-10T00:00:00.000Z") }}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onToggleComplete={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByRole("link", { name: "前往详情验收" })).toHaveAttribute("href", "/tasks/task-1");
    expect(screen.queryByRole("button", { name: "标记为完成" })).not.toBeInTheDocument();
  });
  it("展示任务名称、描述和状态，并支持关闭", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <TaskQuickViewDialog
        task={task}
        onClose={onClose}
        onEdit={vi.fn()}
        onToggleComplete={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "整理项目方案" })).toBeVisible();
    expect(screen.getByText("确认任务查看弹窗的内容和操作。")).toBeVisible();
    expect(screen.getByText("进行中")).toBeVisible();
    expect(screen.getByText("高优先级")).toBeVisible();
    expect(screen.getByText("#设计")).toBeVisible();
    expect(screen.getByText("2026/08/24")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "关闭任务查看" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("将操作委托给外部回调", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onToggleComplete = vi.fn();
    const onDelete = vi.fn();

    render(
      <TaskQuickViewDialog
        task={task}
        onClose={vi.fn()}
        onEdit={onEdit}
        onToggleComplete={onToggleComplete}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole("button", { name: "编辑任务" }));
    await user.click(screen.getByRole("button", { name: "标记为完成" }));
    await user.click(screen.getByRole("button", { name: "删除任务" }));
    await user.click(screen.getByRole("button", { name: "确认删除" }));

    expect(onEdit).toHaveBeenCalledWith(task);
    expect(onToggleComplete).toHaveBeenCalledWith(task);
    expect(onDelete).toHaveBeenCalledWith(task);
  });

  it("日历模式可在速览上方编辑任务，Escape 只关闭编辑表单", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onUpdateTask = vi.fn();

    render(
      <TaskQuickViewDialog
        task={task}
        onClose={onClose}
        onUpdateTask={onUpdateTask}
        onToggleComplete={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "编辑任务" }));
    expect(screen.getByRole("heading", { name: "调整这条任务" })).toBeInTheDocument();
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "调整这条任务" })).not.toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "整理项目方案" })).toBeInTheDocument();
  });
});
