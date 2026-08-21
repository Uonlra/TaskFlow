// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    expect(screen.getByRole("dialog")).toHaveAttribute("data-lenis-prevent-wheel", "true");
    expect(screen.getByRole("heading", { name: "记下一条新的任务" })).toBeInTheDocument();
  });

  it("支持带无障碍名称和悬停提示的纯加号触发器", () => {
    render(
      <TaskFormDialog
        onSubmitTask={() => {}}
        triggerLabel="新增"
        triggerAriaLabel="新增任务"
        triggerIconOnly
      />,
    );

    const trigger = screen.getByRole("button", { name: "新增任务" });

    expect(trigger).toHaveTextContent("+");
    expect(trigger).toHaveAttribute("title", "新增任务");
    expect(trigger).not.toHaveTextContent("新增");
  });

  it("打开弹窗后将焦点放到任务名称", async () => {
    const user = userEvent.setup();
    render(<TaskFormDialog onSubmitTask={() => {}} />);

    await user.click(screen.getByRole("button", { name: "新建任务" }));

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "任务名称" })).toHaveFocus();
    });
  });

  it("Tab 到弹窗末尾后循环回第一个可聚焦控件", async () => {
    const user = userEvent.setup();
    render(<TaskFormDialog onSubmitTask={() => {}} />);

    await user.click(screen.getByRole("button", { name: "新建任务" }));

    const dialog = screen.getByRole("dialog");
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    const first = focusable[0];
    const last = focusable.at(-1);

    expect(first).toBeDefined();
    expect(last).toBeDefined();

    last?.focus();
    await user.tab();

    expect(document.activeElement).toBe(first);
  });

  it("关闭弹窗后将焦点还给打开按钮", async () => {
    const user = userEvent.setup();
    render(<TaskFormDialog onSubmitTask={() => {}} />);

    const trigger = screen.getByRole("button", { name: "新建任务" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "关闭任务表单" }));

    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it("空提交时仅显示标题校验错误", async () => {
    const user = userEvent.setup();
    render(<TaskFormDialog onSubmitTask={() => {}} />);

    await user.click(screen.getByRole("button", { name: "新建任务" }));
    await user.click(screen.getByRole("button", { name: "创建任务" }));

    expect(await screen.findByText("标题至少需要 1 个字符。")).toBeInTheDocument();
    expect(screen.queryByText("说明至少需要 3 个字符。")).not.toBeInTheDocument();
  });

  it("将字段校验错误与无效控件关联", async () => {
    const user = userEvent.setup();
    render(<TaskFormDialog onSubmitTask={() => {}} />);

    await user.click(screen.getByRole("button", { name: "新建任务" }));
    await user.click(screen.getByRole("button", { name: "创建任务" }));

    const titleInput = screen.getByRole("textbox", { name: "任务名称" });
    const error = await screen.findByText("标题至少需要 1 个字符。");

    expect(titleInput).toHaveAttribute("aria-invalid", "true");
    expect(titleInput).toHaveAttribute("aria-describedby", error.id);
    expect(error).toHaveAttribute("role", "alert");
  });

  it("将保存失败作为可播报的异步错误展示", async () => {
    const user = userEvent.setup();
    render(<TaskFormDialog onSubmitTask={() => Promise.reject(new Error("服务暂时不可用。"))} />);

    await user.click(screen.getByRole("button", { name: "新建任务" }));
    await user.type(screen.getByRole("textbox", { name: "任务名称" }), "测试任务");
    await user.click(screen.getByRole("button", { name: "创建任务" }));

    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent("服务暂时不可用。");
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

  it("备注会根据内容高度自动扩展", async () => {
    const user = userEvent.setup();
    render(<TaskFormDialog onSubmitTask={() => {}} />);

    await user.click(screen.getByRole("button", { name: "新建任务" }));

    const description = screen.getByRole("textbox", { name: "备注" });
    Object.defineProperty(description, "scrollHeight", {
      configurable: true,
      value: 164,
    });

    fireEvent.input(description, { target: { value: "补充一段较长的任务说明。" } });

    expect(description).toHaveStyle({ height: "164px" });
  });

  it("可以通过七天日期轨道设置截止日期，并更新日期摘要", async () => {
    const user = userEvent.setup();
    render(<TaskFormDialog onSubmitTask={() => {}} />);

    await user.click(screen.getByRole("button", { name: "新建任务" }));
    await user.click(screen.getByRole("button", { name: "具体描述" }));
    await user.click(screen.getByRole("button", { name: /明天/ }));

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expectedValue = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

    expect(screen.getByDisplayValue(expectedValue)).toHaveAttribute("name", "dueDate");
    expect(document.querySelector(".task-date-summary")).toHaveTextContent("明天");
  });

  it("桌面端可以展开紧凑月历弹层", async () => {
    const user = userEvent.setup();
    render(<TaskFormDialog onSubmitTask={() => {}} />);

    await user.click(screen.getByRole("button", { name: "新建任务" }));
    await user.click(screen.getByRole("button", { name: "具体描述" }));
    await user.click(screen.getByRole("button", { name: "选择具体日期" }));

    expect(screen.getByRole("dialog", { name: "选择截止日期" })).toBeInTheDocument();
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("触控设备会打开原生日期选择器", async () => {
    const showPicker = vi.fn();
    Object.defineProperty(HTMLInputElement.prototype, "showPicker", {
      configurable: true,
      value: showPicker,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    const user = userEvent.setup();
    render(<TaskFormDialog onSubmitTask={() => {}} />);

    await user.click(screen.getByRole("button", { name: "新建任务" }));
    await user.click(screen.getByRole("button", { name: "具体描述" }));
    await user.click(screen.getByRole("button", { name: "选择具体日期" }));

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
