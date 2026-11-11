// @vitest-environment jsdom
import { useState } from "react";
import { act, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskExplorationWorkspace } from "./task-exploration-workspace";
import { TaskEvolutionActionForm } from "./task-evolution-action-form";
import { initializeTaskEvolution } from "@/features/tasks/domain/task-evolution";
import { executeTaskEvolution } from "@/features/tasks/domain/task-evolution-storage";
import type { Task } from "@/features/tasks/types/task.types";

const now = "2026-11-10T00:00:00.000Z";
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
const plain: Task = {
  id: "task",
  title: "知识库",
  description: "",
  status: "in_progress",
  priority: "medium",
  tags: [],
  createdAt: now,
};
function initial() {
  return {
    ...plain,
    evolution: initializeTaskEvolution(plain, now, { objective: plain.title, successCriteria: "能检索 80 篇资料" }),
  };
}
function withResult() {
  const branch = executeTaskEvolution(
    initial(),
    { operationId: "b", expectedRevision: 0, action: { type: "create_branch", title: "方案 A", question: "有效吗？" } },
    now,
  );
  return executeTaskEvolution(
    branch,
    {
      operationId: "r",
      expectedRevision: 1,
      action: { type: "submit_result", branchId: "b", summary: "方法有效", points: ["目录组织", "双向链接"] },
    },
    now,
  );
}
function Harness({ seed = initial(), onSave = () => {} }: { seed?: Task; onSave?: (task: Task) => void }) {
  const [task, setTask] = useState(seed);
  return (
    <>
      <h1>{task.title}</h1>
      <TaskExplorationWorkspace
        task={task}
        onExecute={async (command) => {
          const next = executeTaskEvolution(task, command, now);
          setTask(next);
          onSave(next);
          return next;
        }}
      />
    </>
  );
}

describe("task exploration workflow", () => {
  it("opens the exact result linked from a preview and ignores a missing source", () => {
    const view = render(
      <TaskExplorationWorkspace
        task={withResult()}
        initialTarget={{ branchId: "b", resultId: "r", action: "adopt" }}
        onExecute={vi.fn()}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "目录组织" })).toBeInTheDocument();
    view.unmount();
    render(
      <TaskExplorationWorkspace
        task={withResult()}
        initialTarget={{ branchId: "missing", resultId: "r", action: "adopt" }}
        onExecute={vi.fn()}
      />,
    );
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
  it("does not overwrite a late-loaded initial goal even when its revision is still zero", async () => {
    const user = userEvent.setup();
    const save = vi.fn();
    const props = {
      intent: { type: "adjust_goal" as const },
      onExecute: save,
      onCancel: () => {},
      onSuccess: () => {},
    };
    const view = render(<TaskEvolutionActionForm task={plain} {...props} />);
    await user.type(screen.getByRole("textbox", { name: "操作原因" }), "补充标准");
    view.rerender(<TaskEvolutionActionForm task={initial()} {...props} />);
    await user.click(screen.getByRole("button", { name: "保存记录" }));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("草稿已保留");
  });
  it("checks a branch against the changed goal before allowing further adoption", async () => {
    const user = userEvent.setup();
    const seed = executeTaskEvolution(
      withResult(),
      {
        operationId: "goal",
        expectedRevision: 2,
        action: {
          type: "adjust_goal",
          reason: "范围调整",
          goal: { objective: "优先完成检索", successCriteria: "能找到关联资料" },
        },
      },
      now,
    );
    render(<Harness seed={seed} />);
    expect(screen.queryByRole("button", { name: "选择成果并纳入主线" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "检查此分支" }));
    expect(screen.getByText(/此前依据的目标/)).toHaveTextContent("知识库");
    await user.type(screen.getByRole("textbox", { name: "操作原因" }), "原方案仍然适用");
    await user.click(screen.getByRole("button", { name: "保存记录" }));
    expect(screen.getByRole("button", { name: "选择成果并纳入主线" })).toBeInTheDocument();
  });
  it("creates a branch, submits a conclusion, and adopts only selected immutable content", async () => {
    const user = userEvent.setup();
    const saved = vi.fn();
    render(<Harness onSave={saved} />);
    await user.click(screen.getByRole("button", { name: "创建探索分支" }));
    await user.type(screen.getByRole("textbox", { name: "方案名称" }), "方案 A");
    await user.type(screen.getByRole("textbox", { name: "验证问题" }), "资料是否好找？");
    await user.click(screen.getByRole("button", { name: "保存记录" }));
    await user.click(screen.getByRole("button", { name: "提交结论" }));
    await user.type(screen.getByRole("textbox", { name: "结论摘要" }), "验证有效");
    await user.type(screen.getByRole("textbox", { name: "成果条目（每行一项）" }), "目录组织\n双向链接");
    await user.click(screen.getByRole("button", { name: "保存记录" }));
    await user.click(screen.getByRole("button", { name: "选择成果并纳入主线" }));
    await user.click(screen.getByRole("checkbox", { name: "目录组织" }));
    await user.clear(screen.getByRole("textbox", { name: "保存后的目标" }));
    await user.type(screen.getByRole("textbox", { name: "保存后的目标" }), "可检索知识库");
    await user.type(screen.getByRole("textbox", { name: "选择理由" }), "维护成本低");
    expect(screen.getByLabelText("主任务变更预览")).toHaveTextContent("可检索知识库");
    await user.click(screen.getByRole("button", { name: "确认采纳并保存" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("可检索知识库");
    expect(screen.getByRole("button", { name: "检查此分支" })).toBeInTheDocument();
    const task = saved.mock.calls.at(-1)![0] as Task;
    expect(task.evolution?.adoptions[0].selectedPoints.map((point) => point.text)).toEqual(["目录组织"]);
    expect(task.evolution?.adoptions[0].beforeGoal.objective).toBe("知识库");
    expect(task.evolution?.branches[0].status).toBe("planned");
    expect(task.evolution?.events.at(-1)?.kind).toBe("adopt_result");
  });

  it("allows partial adoption again and disables previously adopted points", async () => {
    const user = userEvent.setup();
    const seed = executeTaskEvolution(
      withResult(),
      {
        operationId: "merge",
        expectedRevision: 2,
        action: {
          type: "adopt_result",
          branchId: "b",
          resultId: "r",
          pointIds: ["r:0"],
          reason: "先采用目录",
          goal: initial().evolution.goal,
        },
      },
      now,
    );
    render(<Harness seed={seed} />);
    await user.click(screen.getByRole("button", { name: "选择成果并纳入主线" }));
    expect(screen.getByRole("checkbox", { name: /目录组织/ })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "双向链接" }));
    await user.type(screen.getByRole("textbox", { name: "选择理由" }), "补充关联");
    await user.click(screen.getByRole("button", { name: "确认采纳并保存" }));
    expect(screen.getByText("2/2 项已采纳")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "选择成果并纳入主线" })).not.toBeInTheDocument();
  });

  it("retains drafts on failure and retries using exactly the same operation", async () => {
    const user = userEvent.setup();
    const task = withResult();
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error("网络中断"))
      .mockImplementationOnce(async (command) => executeTaskEvolution(task, command, now));
    const success = vi.fn();
    render(
      <TaskEvolutionActionForm
        task={task}
        intent={{ type: "adopt_result", branchId: "b", resultId: "r" }}
        onExecute={save}
        onCancel={() => {}}
        onSuccess={success}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: "目录组织" }));
    await user.type(screen.getByRole("textbox", { name: "选择理由" }), "保留这个理由");
    await user.click(screen.getByRole("button", { name: "确认采纳并保存" }));
    expect(screen.getByRole("alert")).toHaveTextContent("网络中断");
    expect(screen.getByRole("textbox", { name: "选择理由" })).toHaveValue("保留这个理由");
    await user.click(screen.getByRole("button", { name: "确认采纳并保存" }));
    expect(save.mock.calls[0][0]).toEqual(save.mock.calls[1][0]);
    expect(success).toHaveBeenCalledTimes(1);
  });

  it("does not submit a stale draft against a newer task revision", async () => {
    const user = userEvent.setup();
    const task = withResult();
    const save = vi.fn();
    const props = {
      intent: { type: "submit_result" as const, branchId: "b" },
      onExecute: save,
      onCancel: () => {},
      onSuccess: () => {},
    };
    const view = render(<TaskEvolutionActionForm task={task} {...props} />);
    await user.type(screen.getByRole("textbox", { name: "结论摘要" }), "草稿");
    await user.type(screen.getByRole("textbox", { name: "成果条目（每行一项）" }), "保留内容");
    const newer = executeTaskEvolution(
      task,
      { operationId: "other", expectedRevision: 2, action: { type: "record_progress", note: "另一端进展" } },
      now,
    );
    view.rerender(<TaskEvolutionActionForm task={newer} {...props} />);
    await user.click(screen.getByRole("button", { name: "保存记录" }));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("草稿已保留");
    expect(screen.getByRole("textbox", { name: "结论摘要" })).toHaveValue("草稿");
  });

  it("blocks a second submission while a save is in flight", async () => {
    const user = userEvent.setup();
    let resolve!: (task: Task) => void;
    const save = vi.fn(
      () =>
        new Promise<Task>((done) => {
          resolve = done;
        }),
    );
    render(
      <TaskEvolutionActionForm
        task={initial()}
        intent={{ type: "record_progress" }}
        onExecute={save}
        onSuccess={() => {}}
        onCancel={() => {}}
      />,
    );
    await user.type(screen.getByRole("textbox", { name: "进展内容" }), "正在验证");
    await user.dblClick(screen.getByRole("button", { name: "保存记录" }));
    expect(save).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "正在保存…" })).toBeDisabled();
    await act(async () => resolve(initial()));
  });

  it("requires branch cleanup before completion, then supports reopening", async () => {
    const user = userEvent.setup();
    render(<Harness seed={withResult()} />);
    expect(screen.getByRole("button", { name: "验收完成" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "调整探索状态" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "探索状态" }), "ended");
    await user.type(screen.getByRole("textbox", { name: "操作原因" }), "验证结束");
    await user.click(screen.getByRole("button", { name: "保存记录" }));
    await user.click(screen.getByRole("button", { name: "验收完成" }));
    await user.type(screen.getByRole("textbox", { name: "验收说明" }), "标准已达成");
    await user.click(screen.getByRole("button", { name: "保存记录" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "重新打开任务" })).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "提交结论" })).not.toBeInTheDocument();
  });

  it("withdraws with an explicit replacement goal while keeping the original event", async () => {
    const user = userEvent.setup();
    const seed = executeTaskEvolution(
      withResult(),
      {
        operationId: "merge",
        expectedRevision: 2,
        action: {
          type: "adopt_result",
          branchId: "b",
          resultId: "r",
          pointIds: ["r:0"],
          reason: "采用目录",
          goal: initial().evolution.goal,
        },
      },
      now,
    );
    const saved = vi.fn();
    render(<Harness seed={seed} onSave={saved} />);
    const events = screen.getByRole("region", { name: "演进记录" });
    await user.click(within(events).getByRole("button", { name: /纳入主线 主线/ }));
    await user.click(screen.getByRole("button", { name: "撤回此次采纳" }));
    await user.type(screen.getByRole("textbox", { name: "操作原因" }), "重新比较方案");
    await user.click(screen.getByRole("button", { name: "保存记录" }));
    expect(saved.mock.calls.at(-1)![0].evolution.adoptions[0].withdrawnBy).toBeTruthy();
    expect(within(events).getByRole("button", { name: /撤回采纳 主线/ })).toBeInTheDocument();
  });
});
