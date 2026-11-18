// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskWorkbenchExploration } from "./task-workbench-exploration";
import { TaskExplorationIndicator } from "./task-exploration-indicator";
import { graphCommand, graphFixture, graphFixtureTime } from "../../../../test/fixtures/task-evolution";
import type { Task } from "@/features/tasks/types/task.types";

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
const state = graphFixture();
const task: Task = {
  id: state.taskId,
  title: state.goal.objective,
  description: "",
  priority: "medium",
  status: "in_progress",
  tags: [],
  createdAt: graphFixtureTime,
  evolution: state,
};

describe("workbench exploration summary", () => {
  it("expands real relations on demand and links each decision to an exact source", async () => {
    const user = userEvent.setup();
    render(<TaskWorkbenchExploration evolution={state} />);
    expect(screen.queryByRole("group", { name: "探索关系" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "成果待采纳：继续验证目录层级" })).toHaveAttribute(
      "href",
      expect.stringContaining("result=ra2&action=adopt"),
    );
    await user.click(screen.getByRole("button", { name: /探索 3/ }));
    const group = screen.getByRole("group", { name: "探索关系" });
    expect(within(group).getAllByRole("listitem")).toHaveLength(3);
    expect(within(group).getByRole("link", { name: "Markdown 方案" })).toHaveAttribute(
      "href",
      "/tasks/graph-fixture?event=a&branch=a",
    );
    expect(within(group).getByText("已采纳 1 项")).toBeInTheDocument();
    expect(within(group).queryByRole("link", { name: "采纳「自动分类方案」的成果" })).not.toBeInTheDocument();
    expect(within(group).getByRole("link", { name: "采纳「搜索工具方案」的成果" })).toHaveAttribute(
      "href",
      expect.stringContaining("result=rc"),
    );
  });

  it("focuses an explicitly opened relation and preserves expansion when newer task data arrives", () => {
    const view = render(<TaskWorkbenchExploration evolution={state} initiallyOpen />);
    const toggle = screen.getByRole("button", { name: /探索 3/ });
    expect(toggle).toHaveFocus();
    const changed = graphCommand(state, "goal", {
      type: "adjust_goal",
      goal: { ...state.goal, objective: "新目标" },
      reason: "范围调整",
    });
    view.rerender(<TaskWorkbenchExploration evolution={changed} initiallyOpen />);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "检查「自动分类方案」" })).toHaveAttribute(
      "href",
      expect.stringContaining("branch=b&action=review"),
    );
    view.rerender(<TaskWorkbenchExploration evolution={{ ...changed, status: "done" }} initiallyOpen />);
    expect(screen.queryByRole("link", { name: /检查「/ })).not.toBeInTheDocument();
    expect(screen.queryByText("分支待检查")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "自动分类方案" })).toBeInTheDocument();
  });

  it("hides empty summaries and shows only the highest-priority decision in a list indicator", () => {
    const view = render(<TaskExplorationIndicator task={{ ...task, evolution: undefined }} />);
    expect(view.container).toBeEmptyDOMElement();
    view.rerender(<TaskWorkbenchExploration evolution={{ ...state, branches: [] }} />);
    expect(view.container).toBeEmptyDOMElement();
    const changed = graphCommand(state, "goal", {
      type: "adjust_goal",
      goal: { ...state.goal, objective: "新目标" },
      reason: "范围调整",
    });
    view.rerender(<TaskExplorationIndicator task={{ ...task, evolution: changed }} />);
    expect(screen.getByText("待检查 1")).toBeInTheDocument();
    expect(screen.queryByText(/待采纳/)).not.toBeInTheDocument();
    view.rerender(<TaskExplorationIndicator task={{ ...task, evolution: { ...changed, status: "done" } }} />);
    expect(screen.getByText("3 个方案")).toBeInTheDocument();
    expect(screen.queryByText(/待检查|待采纳/)).not.toBeInTheDocument();
  });
});
