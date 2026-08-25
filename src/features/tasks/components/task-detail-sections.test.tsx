// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TaskDetailMoreContent } from "@/features/tasks/components/task-detail-sections";

describe("TaskDetailMoreContent", () => {
  it("keeps extension content collapsed until requested", async () => {
    const user = userEvent.setup();
    render(<TaskDetailMoreContent />);

    const trigger = screen.getByRole("button", { name: "更多内容" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("暂无子任务，后续可在这里拆分执行步骤。")).not.toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("暂无子任务，后续可在这里拆分执行步骤。")).toBeInTheDocument();
  });
});
