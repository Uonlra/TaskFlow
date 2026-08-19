// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConfirmDialog } from "@/shared/components/common/confirm-dialog";

describe("ConfirmDialog accessibility", () => {
  it("opens a labelled modal and focuses the safe action", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        triggerLabel="删除任务"
        title="删除这条任务？"
        description="删除后无法恢复。"
        confirmLabel="删除"
        onConfirm={vi.fn()}
        confirmTone="danger"
      />,
    );

    await user.click(screen.getByRole("button", { name: "删除任务" }));

    const dialog = screen.getByRole("dialog", { name: "删除这条任务？" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "取消" })).toHaveFocus();
  });

  it("keeps Tab focus inside the modal", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        triggerLabel="删除任务"
        title="删除这条任务？"
        description="删除后无法恢复。"
        confirmLabel="删除"
        onConfirm={vi.fn()}
        confirmTone="danger"
      />,
    );

    await user.click(screen.getByRole("button", { name: "删除任务" }));

    const cancelButton = screen.getByRole("button", { name: "取消" });
    const confirmButton = screen.getByRole("button", { name: "删除" });
    confirmButton.focus();
    await user.tab();

    expect(document.activeElement).toBe(cancelButton);
  });

  it("restores focus to the trigger after Escape closes the modal", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        triggerLabel="删除任务"
        title="删除这条任务？"
        description="删除后无法恢复。"
        confirmLabel="删除"
        onConfirm={vi.fn()}
        confirmTone="danger"
      />,
    );

    const trigger = screen.getByRole("button", { name: "删除任务" });
    await user.click(trigger);
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });
});
