// @vitest-environment jsdom
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskEvolutionGraph } from "./task-evolution-graph";
import { graphFixture, graphCommand } from "../../../../test/fixtures/task-evolution";

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
describe("TaskEvolutionGraph", () => {
  it("opens and focuses the historical event addressed by a detail link", async () => {
    render(<TaskEvolutionGraph evolution={graphFixture()} initialEventId="ra" />);
    const row = screen.getByRole("button", { name: /提交结论 Markdown 方案.*目录与链接验证有效/ });
    expect(row).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "节点详情" })).toHaveTextContent("目录组织");
    await waitFor(() => expect(row).toHaveFocus());
  });
  it("traces a withdrawal back to the exact original adoption", async () => {
    const user = userEvent.setup();
    render(<TaskEvolutionGraph evolution={graphFixture()} onWithdraw={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /撤回采纳 主线/ }));
    const details = screen.getByRole("region", { name: "节点详情" });
    expect(details).toHaveTextContent("已撤回成果：");
    expect(details).toHaveTextContent("双向链接");
    expect(details).not.toHaveTextContent("目录组织");
    await user.click(within(details).getByRole("button", { name: "定位原采纳" }));
    expect(screen.getByRole("button", { name: /纳入主线 主线.*补充关联方法/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.queryByRole("button", { name: "撤回此次采纳" })).not.toBeInTheDocument();
  });
  it("opens details with the right arrow and returns focus on Escape", async () => {
    const user = userEvent.setup();
    render(<TaskEvolutionGraph evolution={graphFixture()} />);
    const row = screen.getByRole("button", { name: /撤回采纳 主线/ });
    row.focus();
    await user.keyboard("{ArrowRight}");
    await waitFor(() =>
      expect(within(screen.getByRole("region", { name: "节点详情" })).getByRole("heading")).toHaveFocus(),
    );
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("region", { name: "节点详情" })).not.toBeInTheDocument();
    expect(row).toHaveFocus();
  });

  it("keeps an old selection visible when switching to the full history", async () => {
    const user = userEvent.setup();
    let state = graphFixture();
    for (let index = 0; index < 40; index++)
      state = graphCommand(state, `more-${index}`, { type: "record_progress", note: "继续推进" });
    render(<TaskEvolutionGraph evolution={state} />);
    await user.click(screen.getByRole("button", { name: /建立演进起点 主线/ }));
    await user.click(screen.getByRole("button", { name: /查看全部/ }));
    expect(screen.getByRole("button", { name: /建立演进起点 主线/ })).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("button", { name: "关闭节点详情" }));
    expect(screen.getByRole("button", { name: /建立演进起点 主线/ })).toHaveFocus();
  });

  it("resets the inspector and branch emphasis when displaying a different task", async () => {
    const user = userEvent.setup();
    const state = graphFixture();
    const view = render(<TaskEvolutionGraph evolution={state} />);
    await user.selectOptions(screen.getByRole("combobox", { name: "突出分支" }), "a");
    await user.click(screen.getByRole("button", { name: /撤回采纳 主线/ }));
    view.rerender(<TaskEvolutionGraph evolution={{ ...state, taskId: "different-task" }} />);
    expect(screen.queryByRole("region", { name: "节点详情" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "突出分支" })).toHaveValue("");
  });
  it("opens a merge inspector, showing immutable adopted points and its source result", async () => {
    const user = userEvent.setup();
    const selectBranch = vi.fn();
    const withdraw = vi.fn();
    const { container } = render(
      <TaskEvolutionGraph evolution={graphFixture()} onSelectBranch={selectBranch} onWithdraw={withdraw} />,
    );
    const merge = screen.getByRole("button", { name: /纳入主线 主线.*先确定组织方式/ });
    await user.click(merge);
    const inspector = screen.getByRole("region", { name: "节点详情" });
    expect(inspector).toHaveTextContent("目录组织");
    expect(inspector).not.toHaveTextContent("双向链接");
    await user.click(within(inspector).getByRole("button", { name: "查看来源分支" }));
    expect(selectBranch).toHaveBeenCalledWith("a");
    await user.click(within(inspector).getByRole("button", { name: "撤回此次采纳" }));
    expect(withdraw).toHaveBeenCalledWith("m1");
    const edge = container.querySelector('path[data-edge-kind="merge"][data-target-event="m1"]');
    expect(edge).toHaveAttribute("data-source-event", "ra");
    await user.click(within(inspector).getByRole("button", { name: "定位来源结论" }));
    await waitFor(() =>
      expect(screen.getByRole("region", { name: "节点详情" })).toHaveTextContent("目录与链接验证有效"),
    );
  });

  it("expands a folded interval without adding fake merge nodes", async () => {
    const user = userEvent.setup();
    const { container } = render(<TaskEvolutionGraph evolution={graphFixture()} />);
    expect(screen.queryByRole("button", { name: /记录进展.*准备 80 篇资料/ })).not.toBeInTheDocument();
    const mergeCount = container.querySelectorAll('path[data-edge-kind="merge"]').length;
    await user.click(screen.getAllByRole("button", { name: /展开 1 条进展与步骤记录/ })[1]);
    expect(screen.getByRole("button", { name: /记录进展.*准备 80 篇资料/ })).toBeInTheDocument();
    expect(container.querySelectorAll('path[data-edge-kind="merge"]')).toHaveLength(mergeCount);
  });

  it("supports keyboard navigation and restores row focus when closing details", async () => {
    const user = userEvent.setup();
    render(<TaskEvolutionGraph evolution={graphFixture()} />);
    const first = screen.getByRole("button", { name: /撤回采纳 主线/ });
    first.focus();
    await user.keyboard("{ArrowDown}");
    const next = screen.getByRole("button", { name: /提交结论 Markdown 方案.*继续验证目录层级/ });
    expect(next).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("region", { name: "节点详情" })).toHaveTextContent("限制目录深度");
    await user.click(screen.getByRole("button", { name: "关闭节点详情" }));
    expect(next).toHaveFocus();
  });

  it("highlights a selected branch without removing other records", async () => {
    const user = userEvent.setup();
    const { container } = render(<TaskEvolutionGraph evolution={graphFixture()} />);
    const count = container.querySelectorAll(".task-evolution-graph-row").length;
    await user.selectOptions(screen.getByRole("combobox", { name: "突出分支" }), "b");
    expect(container.querySelectorAll(".task-evolution-graph-row")).toHaveLength(count);
    expect(container.querySelectorAll(".is-dimmed").length).toBeGreaterThan(0);
  });

  it("pages long histories while keeping the selection and nodes aligned", async () => {
    const user = userEvent.setup();
    let state = graphFixture();
    for (let i = 0; i < 40; i++)
      state = graphCommand(state, `progress-${i}`, { type: "record_progress", note: `主线进展 ${i}` });
    render(<TaskEvolutionGraph evolution={state} />);
    await user.click(screen.getByRole("button", { name: /查看全部/ }));
    expect(screen.queryByRole("button", { name: /建立演进起点 主线/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /加载更早记录/ }));
    expect(screen.getByRole("button", { name: /建立演进起点 主线/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /记录进展 主线.*主线进展 39/ }));
    await user.click(screen.getByRole("button", { name: "只看关键记录" }));
    expect(screen.getByRole("button", { name: /记录进展 主线.*主线进展 39/ })).toHaveAttribute("aria-expanded", "true");
  });
});
