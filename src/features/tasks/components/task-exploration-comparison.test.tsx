// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TaskExplorationComparison } from "./task-exploration-comparison";
import { graphCommand, graphFixture, graphFixtureGoal } from "../../../../test/fixtures/task-evolution";

describe("TaskExplorationComparison", () => {
  it("compares exact versions and passes only chosen, unadopted points to the confirmation form", async () => {
    const user = userEvent.setup();
    const open = vi.fn();
    render(
      <TaskExplorationComparison
        evolution={graphFixture()}
        branchIds={["a", "c"]}
        actionsDisabled={false}
        onOpen={open}
        onClose={vi.fn()}
      />,
    );
    const version = screen.getByRole("combobox", { name: "Markdown 方案的结论版本" });
    expect(version).toHaveValue("ra2");
    await user.click(screen.getByRole("checkbox", { name: "限制目录深度" }));
    await user.selectOptions(version, "ra");
    expect(screen.queryByRole("checkbox", { name: /目录组织/ })).not.toBeInTheDocument();
    expect(screen.getByText("目录组织")).toHaveTextContent("已采纳");
    expect(screen.queryByRole("button", { name: "纳入主线 · 1" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "双向链接" }));
    expect(open).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "纳入主线 · 1" }));
    expect(open).toHaveBeenCalledExactlyOnceWith({
      type: "adopt_result",
      branchId: "a",
      resultId: "ra",
      pointIds: ["ra:1"],
    });
    await user.selectOptions(version, "ra2");
    expect(screen.getByRole("checkbox", { name: "限制目录深度" })).toBeChecked();
  });

  it("replaces adoption with recovery or review actions and handles absent conclusions", async () => {
    const user = userEvent.setup();
    const open = vi.fn();
    let state = graphCommand(graphFixture(), "d", { type: "create_branch", title: "新方案", question: "可行吗？" });
    const props = { branchIds: ["a", "b", "d"], actionsDisabled: false, onOpen: open, onClose: vi.fn() };
    const view = render(<TaskExplorationComparison evolution={state} {...props} />);
    expect(screen.getByText("尚无结论")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "需要人工校对分类" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "恢复探索" }));
    expect(open).toHaveBeenLastCalledWith({ type: "set_branch_status", branchId: "b", status: "exploring" });
    state = graphCommand(state, "goal", {
      type: "adjust_goal",
      goal: { ...graphFixtureGoal, objective: "收敛后的目标" },
      reason: "优先检索",
    });
    view.rerender(<TaskExplorationComparison evolution={state} {...props} />);
    expect(screen.getByRole("checkbox", { name: "限制目录深度" })).toBeDisabled();
    await user.click(screen.getAllByRole("button", { name: "检查分支" })[0]);
    expect(open).toHaveBeenLastCalledWith({ type: "review_branch", branchId: "a" });
    expect(screen.getAllByText("建立个人知识库")).toHaveLength(3);
  });

  it("removes remotely adopted selections and locks controls while a form is open or the task is complete", async () => {
    const user = userEvent.setup();
    const open = vi.fn();
    let state = graphFixture();
    const props = { branchIds: ["a", "c"], onOpen: open, onClose: vi.fn() };
    const view = render(<TaskExplorationComparison evolution={state} actionsDisabled={false} {...props} />);
    await user.click(screen.getByRole("checkbox", { name: "限制目录深度" }));
    view.rerender(<TaskExplorationComparison evolution={state} actionsDisabled {...props} />);
    expect(screen.getByRole("button", { name: "纳入主线 · 1" })).toBeDisabled();
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "返回演进" })).toBeDisabled();
    state = graphCommand(state, "remote", {
      type: "adopt_result",
      branchId: "a",
      resultId: "ra2",
      pointIds: ["ra2:0"],
      reason: "另一端已确认",
      goal: graphFixtureGoal,
    });
    view.rerender(<TaskExplorationComparison evolution={state} actionsDisabled={false} {...props} />);
    expect(screen.getByText("已全部采纳")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "纳入主线 · 1" })).not.toBeInTheDocument();
    view.rerender(
      <TaskExplorationComparison evolution={{ ...state, status: "done" }} actionsDisabled={false} {...props} />,
    );
    expect(screen.getAllByText("任务已完成")).toHaveLength(2);
    expect(within(screen.getByRole("group", { name: "搜索工具方案成果条目" })).getByRole("checkbox")).toBeDisabled();
    expect(open).not.toHaveBeenCalled();
  });
});
