// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";

describe("TaskFormDialog", () => {
  it("点击新建任务后显示表单弹窗", async () => {
    const user = userEvent.setup();
    render(<TaskFormDialog onSubmitTask={() => {}} />);

    await user.click(screen.getByRole("button", { name: "新建任务" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "记下一条新的任务" }),
    ).toBeInTheDocument();
  });

  it("空提交时显示标题和说明的校验错误", async () => {
    const user = userEvent.setup();
    render(<TaskFormDialog onSubmitTask={() => {}} />);

    await user.click(screen.getByRole("button", { name: "新建任务" }));
    await user.click(screen.getByRole("button", { name: "创建任务" }));

    expect(
      await screen.findByText("标题至少需要 1 个字符。"),
    ).toBeInTheDocument();
    expect(screen.getByText("说明至少需要 3 个字符。")).toBeInTheDocument();
  });

  it("填写合法数据后提交，调用 onSubmitTask 并关闭弹窗", async () => {
    const onSubmitTask = vi.fn();
    const user = userEvent.setup();
    render(<TaskFormDialog onSubmitTask={onSubmitTask} />);

    await user.click(screen.getByRole("button", { name: "新建任务" }));
    await user.type(screen.getByRole("textbox", { name: "标题" }), "测试任务");
    await user.type(screen.getByRole("textbox", { name: "说明" }), "这是说明内容");
    await user.click(screen.getByRole("button", { name: "创建任务" }));

    await waitFor(() => {
      expect(onSubmitTask).toHaveBeenCalledTimes(1);
    });

    expect(onSubmitTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "测试任务",
        description: "这是说明内容",
      }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
