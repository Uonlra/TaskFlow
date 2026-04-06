"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
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
        style={{
          border: 0,
          padding: "14px 18px",
          borderRadius: 999,
          background: triggerLabel === "新建任务" ? "var(--primary)" : "rgba(255,255,255,0.76)",
          color: triggerLabel === "新建任务" ? "var(--primary-foreground)" : "var(--foreground)",
          fontWeight: 700,
          justifySelf: "start",
        }}
      >
        {triggerLabel}
      </button>

      {open ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(16, 24, 40, 0.38)",
            display: "grid",
            placeItems: "center",
            padding: 20,
            zIndex: 30,
          }}
        >
          <div
            className="card-surface"
            style={{
              width: "min(620px, 100%)",
              borderRadius: 28,
              padding: 24,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start" }}>
              <div>
                <p style={{ margin: 0, color: "var(--primary)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {dialogEyebrow}
                </p>
                <h2 style={{ margin: "10px 0 0", fontSize: "1.6rem" }}>{dialogTitle}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  border: "1px solid var(--border)",
                  background: "transparent",
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  fontSize: "1.1rem",
                }}
              >
                x
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: "grid", gap: 14, marginTop: 20 }}>
              <Field label="标题" error={errors.title?.message}>
                <input
                  {...register("title")}
                  placeholder="例如：整理入职说明文档"
                  style={inputStyle(Boolean(errors.title))}
                />
              </Field>

              <Field label="说明" error={errors.description?.message}>
                <textarea
                  {...register("description")}
                  placeholder="写清楚这项任务要达到什么结果，以及它为什么重要。"
                  rows={4}
                  style={{ ...inputStyle(Boolean(errors.description)), resize: "vertical" }}
                />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="状态" error={errors.status?.message}>
                  <select {...register("status")} style={inputStyle(Boolean(errors.status))}>
                    <option value="todo">待开始</option>
                    <option value="in_progress">进行中</option>
                    <option value="done">已完成</option>
                  </select>
                </Field>

                <Field label="优先级" error={errors.priority?.message}>
                  <select {...register("priority")} style={inputStyle(Boolean(errors.priority))}>
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                </Field>
              </div>

              <Field label="标签" error={errors.tags?.message}>
                <input
                  {...register("tags")}
                  placeholder="例如：设计，首屏，移动端"
                  style={inputStyle(Boolean(errors.tags))}
                />
              </Field>

              <Field label="截止日期" error={errors.dueDate?.message}>
                <input type="date" {...register("dueDate")} style={inputStyle(Boolean(errors.dueDate))} />
              </Field>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    border: "1px solid var(--border)",
                    background: "transparent",
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
                    border: 0,
                    padding: "12px 16px",
                    borderRadius: 999,
                    background: "var(--primary)",
                    color: "var(--primary-foreground)",
                    fontWeight: 700,
                    opacity: isSubmitting ? 0.8 : 1,
                  }}
                >
                  {isSubmitting ? "保存中..." : submitLabel}
                </button>
              </div>
              {submitError ? <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.95rem" }}>{submitError}</p> : null}
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>{label}</span>
      {children}
      {error ? <span style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{error}</span> : null}
    </label>
  );
}

function inputStyle(hasError: boolean) {
  return {
    width: "100%",
    borderRadius: 16,
    border: `1px solid ${hasError ? "rgba(178,64,55,0.48)" : "var(--border)"}`,
    padding: "14px 16px",
    background: "rgba(255,255,255,0.9)",
  };
}
