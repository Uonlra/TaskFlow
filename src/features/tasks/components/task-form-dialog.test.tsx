// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";

describe("TaskFormDialog", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("点击新建任务后显示表单弹窗", async () => {
    const user = userEvent.setup();
    render(<TaskFormDialog onSubmitTask={() => {}} />);

    await user.click(screen.getByRole("button", { name: "新建任务" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "记下一条新的任务" }),
    ).toBeInTheDocument();
  });

  it("空提交时仅显示标题校验错误", async () => {
    const user = userEvent.setup();
    render(<TaskFormDialog onSubmitTask={() => {}} />);

    await user.click(screen.getByRole("button", { name: "新建任务" }));
    await user.click(screen.getByRole("button", { name: "创建任务" }));

    expect(
      await screen.findByText("标题至少需要 1 个字符。"),
    ).toBeInTheDocument();
    expect(screen.queryByText("说明至少需要 3 个字符。")).not.toBeInTheDocument();
  });

  it("仅填写标题也可以创建任务", async () => {
    const onSubmitTask = vi.fn();
    const user = userEvent.setup();
    render(<TaskFormDialog onSubmitTask={onSubmitTask} />);

    await user.click(screen.getByRole("button", { name: "新建任务" }));
    await user.type(screen.getByRole("textbox", { name: "任务名称" }), "测试任务");
    await user.click(screen.getByRole("button", { name: "创建任务" }));

    await waitFor(() => {
      expect(onSubmitTask).toHaveBeenCalledTimes(1);
    });

    expect(onSubmitTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "测试任务",
        description: "",
      }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("可以通过日期快捷选择设置截止日期", async () => {
    const user = userEvent.setup();
    render(<TaskFormDialog onSubmitTask={() => {}} />);

    await user.click(screen.getByRole("button", { name: "新建任务" }));
    await user.click(screen.getByRole("button", { name: "安排与分类" }));
    await user.click(screen.getByRole("button", { name: "明天" }));

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expectedValue = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

    expect(screen.getByLabelText("自定义截止日期")).toHaveValue(expectedValue);
  });

  it("点击日期输入行会打开原生日期选择器", async () => {
    const showPicker = vi.fn();
    Object.defineProperty(HTMLInputElement.prototype, "showPicker", {
      configurable: true,
      value: showPicker,
    });
    const user = userEvent.setup();
    render(<TaskFormDialog onSubmitTask={() => {}} />);

    await user.click(screen.getByRole("button", { name: "新建任务" }));
    await user.click(screen.getByRole("button", { name: "安排与分类" }));
    await user.click(screen.getByLabelText("自定义截止日期"));

    expect(showPicker).toHaveBeenCalledTimes(1);
  });

  it("打开弹窗时锁定背景滚动，关闭后恢复", async () => {
    const user = userEvent.setup();
    render(<TaskFormDialog onSubmitTask={() => {}} />);

    await user.click(screen.getByRole("button", { name: "新建任务" }));

    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.overflow).toBe("hidden");

    await user.click(screen.getByRole("button", { name: "关闭任务表单" }));

    await waitFor(() => {
      expect(document.documentElement.style.overflow).toBe("");
      expect(document.body.style.position).toBe("");
      expect(document.body.style.overflow).toBe("");
    });
  });
});
