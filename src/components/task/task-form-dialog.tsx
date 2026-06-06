"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  CustomSelect,
  type CustomSelectOption,
} from "@/components/common/custom-select";
import { taskSchema, type TaskFormValues } from "@/features/tasks/schemas/task-schema";

type TaskFormDialogProps = {
  onSubmitTask: (values: TaskFormValues) => void | Promise<void>;
  initialValues?: TaskFormValues;
  triggerLabel?: string;
  dialogEyebrow?: string;
  dialogTitle?: string;
  submitLabel?: string;
};

export function TaskFormDialog({
  onSubmitTask,
  initialValues,
  triggerLabel = "新建任务",
  dialogEyebrow = "创建任务",
  dialogTitle = "补上一条新的工作事项",
  submitLabel = "创建任务",
}: TaskFormDialogProps) {
  const headingId = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: initialValues ?? {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      tags: "",
      dueDate: "",
    },
  });

  useEffect(() => {
    setMounted(true);

    return () => {
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    if (!open || !mounted) {
      document.body.style.removeProperty("overflow");
      return;
    }

    document.body.style.overflow = "hidden";
    titleInputRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.removeProperty("overflow");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSubmitting, mounted, open]);

  const onSubmit = async (values: TaskFormValues) => {
    setSubmitError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 250));
      await onSubmitTask(values);
      reset(
        initialValues ?? {
          title: "",
          description: "",
          status: "todo",
          priority: "medium",
          tags: "",
          dueDate: "",
        },
      );
      setOpen(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "保存任务时出了点问题，请稍后再试。");
    }
  };

  const openDialog = () => {
    reset(
      initialValues ?? {
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        tags: "",
        dueDate: "",
      },
    );
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="ui-sans"
        style={{
          border: triggerLabel === "新建任务" ? "1px solid transparent" : "1px solid var(--border)",
          padding: "14px 18px",
          borderRadius: 999,
          background:
            triggerLabel === "新建任务"
              ? "linear-gradient(135deg, var(--primary), var(--data-cyan))"
              : "rgba(255,255,255,0.82)",
          color: triggerLabel === "新建任务" ? "var(--primary-foreground)" : "var(--foreground)",
          fontWeight: 700,
          justifySelf: "start",
          boxShadow: triggerLabel === "新建任务" ? "0 12px 28px rgba(37,99,235,0.18)" : "none",
        }}
      >
        {triggerLabel}
      </button>

      {open && mounted
        ? createPortal(
        <div
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) {
              setOpen(false);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(16, 24, 40, 0.38)",
            display: "grid",
            placeItems: "center",
            padding: 20,
            zIndex: 2000,
            overflowY: "auto",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            className="card-surface"
            style={{
              width: "min(620px, 100%)",
              maxHeight: "min(860px, calc(100vh - 40px))",
              borderRadius: 28,
              padding: 24,
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start" }}>
              <div>
                <p className="section-eyebrow" style={{ margin: 0, color: "var(--primary)", fontWeight: 700, fontSize: "0.82rem" }}>
                  {dialogEyebrow}
                </p>
                <h2 id={headingId} style={{ margin: "10px 0 0", fontSize: "1.6rem" }}>{dialogTitle}</h2>
                <p style={{ margin: "8px 0 0", color: "var(--muted-strong)", lineHeight: 1.72 }}>
                  先写清楚任务结果，再补状态、优先级和标签，这样列表会更容易被整理和回看。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭任务表单"
                style={{
                    border: "1px solid var(--border)",
                    background: "rgba(255,255,255,0.8)",
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                  fontSize: "1.1rem",
                }}
              >
                x
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: "grid", gap: 16, marginTop: 20 }}>
              <Field label="标题" error={errors.title?.message}>
                <input
                  {...register("title")}
                  className="task-field"
                  ref={(node) => {
                    register("title").ref(node);
                    titleInputRef.current = node;
                  }}
                  placeholder="例如：整理入职说明文档"
                  style={inputStyle(Boolean(errors.title))}
                />
              </Field>

              <Field label="说明" error={errors.description?.message}>
                <textarea
                  {...register("description")}
                  className="task-field task-textarea"
                  placeholder="写清楚这项任务要达到什么结果，以及它为什么重要。"
                  rows={4}
                  style={{ ...inputStyle(Boolean(errors.description)), resize: "vertical" }}
                />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
                <Field label="状态" error={errors.status?.message}>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <CustomSelect
                        ariaLabel="任务状态"
                        value={field.value}
                        options={taskStatusOptions}
                        onChange={field.onChange}
                        invalid={Boolean(errors.status)}
                      />
                    )}
                  />
                </Field>

                <Field label="优先级" error={errors.priority?.message}>
                  <Controller
                    control={control}
                    name="priority"
                    render={({ field }) => (
                      <CustomSelect
                        ariaLabel="任务优先级"
                        value={field.value}
                        options={taskPriorityOptions}
                        onChange={field.onChange}
                        invalid={Boolean(errors.priority)}
                      />
                    )}
                  />
                </Field>
              </div>

              <Field label="标签" error={errors.tags?.message}>
                <input
                  {...register("tags")}
                  className="task-field"
                  placeholder="例如：设计，首屏，移动端"
                  style={inputStyle(Boolean(errors.tags))}
                />
              </Field>

              <Field label="截止日期" error={errors.dueDate?.message}>
                <input
                  type="date"
                  {...register("dueDate")}
                  className="task-field task-date"
                  style={inputStyle(Boolean(errors.dueDate))}
                />
              </Field>

              <div
                className="ui-sans"
                style={{
                  padding: "14px 16px",
                  borderRadius: 18,
                  border: "1px solid var(--border)",
                  background: "rgba(37,99,235,0.05)",
                  color: "var(--muted-strong)",
                  fontSize: "0.92rem",
                }}
              >
                标签支持中英文逗号分隔；截止日期可留空，稍后在列表里再排序整理。
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                  style={{
                    border: "1px solid var(--border)",
                    background: "rgba(255,255,255,0.84)",
                    padding: "12px 16px",
                    borderRadius: 999,
                    fontWeight: 700,
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    border: "1px solid transparent",
                    padding: "12px 16px",
                    borderRadius: 999,
                    background: "linear-gradient(135deg, var(--primary), var(--data-cyan))",
                    color: "var(--primary-foreground)",
                    fontWeight: 700,
                    opacity: isSubmitting ? 0.8 : 1,
                    boxShadow: "0 10px 22px rgba(37,99,235,0.18)",
                  }}
                >
                  {isSubmitting ? "保存中..." : submitLabel}
                </button>
              </div>
              {submitError ? <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.95rem" }}>{submitError}</p> : null}
            </form>
          </div>
        </div>,
        document.body,
      )
        : null}
    </>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span className="ui-sans" style={{ fontSize: "0.95rem", fontWeight: 600 }}>{label}</span>
      {children}
      {error ? <span style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{error}</span> : null}
    </label>
  );
}

function inputStyle(hasError: boolean) {
  return {
    width: "100%",
    ...(hasError ? { borderColor: "rgba(178,64,55,0.48)" } : {}),
  };
}

const taskStatusOptions: Array<CustomSelectOption<TaskFormValues["status"]>> = [
  { value: "todo", label: "待开始", description: "还没有进入执行阶段" },
  { value: "in_progress", label: "进行中", description: "已经开始推进这条任务" },
  { value: "done", label: "已完成", description: "这条任务已经收口" },
];

const taskPriorityOptions: Array<CustomSelectOption<TaskFormValues["priority"]>> = [
  { value: "low", label: "低", description: "可以晚一点处理" },
  { value: "medium", label: "中", description: "当前常规推进事项" },
  { value: "high", label: "高", description: "应该优先安排和处理" },
];
