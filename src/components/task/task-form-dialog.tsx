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
        className={
          triggerLabel === "新建任务"
            ? "tesla-action tesla-action--primary"
            : "tesla-action tesla-action--secondary"
        }
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
          className="dialog-overlay"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            className="task-dialog card-surface"
          >
            <div className="task-dialog__header">
              <div>
                <p className="section-eyebrow task-dialog__eyebrow">
                  {dialogEyebrow}
                </p>
                <h2 id={headingId} className="task-dialog__title">{dialogTitle}</h2>
                <p className="task-dialog__description">
                  先把要做什么写清楚，再补状态、优先级和标签。以后回来看，也不用猜当时的自己在想什么。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭任务表单"
                className="dialog-close-button"
              >
                x
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="task-dialog__form">
              <Field label="标题" error={errors.title?.message}>
                <input
                  {...register("title")}
                  className="task-field"
                  ref={(node) => {
                    register("title").ref(node);
                    titleInputRef.current = node;
                  }}
                  placeholder="例如：整理入职说明文档"
                  aria-invalid={Boolean(errors.title)}
                />
              </Field>

              <Field label="说明" error={errors.description?.message}>
                <textarea
                  {...register("description")}
                  className="task-field task-textarea"
                  placeholder="写清楚要做到什么程度，顺手补一句为什么要做。"
                  rows={4}
                  aria-invalid={Boolean(errors.description)}
                />
              </Field>

              <div className="task-dialog__grid">
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
                  aria-invalid={Boolean(errors.tags)}
                />
              </Field>

              <Field label="截止日期" error={errors.dueDate?.message}>
                <input
                  type="date"
                  {...register("dueDate")}
                  className="task-field task-date"
                  aria-invalid={Boolean(errors.dueDate)}
                />
              </Field>

              <div className="task-dialog__hint">
                标签支持中英文逗号分隔；截止日期可以留空，之后再补也行。
              </div>

              <div className="task-dialog__actions">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                  className="tesla-action tesla-action--secondary"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="tesla-action tesla-action--primary"
                >
                  {isSubmitting ? "保存中..." : submitLabel}
                </button>
              </div>
              {submitError ? <p className="task-dialog__error">{submitError}</p> : null}
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
    <label className="task-dialog__field">
      <span className="task-dialog__label">{label}</span>
      {children}
      {error ? <span className="task-dialog__error">{error}</span> : null}
    </label>
  );
}

const taskStatusOptions: Array<CustomSelectOption<TaskFormValues["status"]>> = [
  { value: "todo", label: "待开始", description: "还没动手" },
  { value: "in_progress", label: "进行中", description: "已经开始处理" },
  { value: "done", label: "已完成", description: "这条已经收掉" },
];

const taskPriorityOptions: Array<CustomSelectOption<TaskFormValues["priority"]>> = [
  { value: "low", label: "低", description: "可以晚点看" },
  { value: "medium", label: "中", description: "正常推进就好" },
  { value: "high", label: "高", description: "建议先安排" },
];
