"use client";

import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  CustomSelect,
  type CustomSelectOption,
} from "@/shared/components/common/custom-select";
import { taskSchema, type TaskFormValues } from "@/features/tasks/schemas/task-schema";
import { formatTagsInput, parseTagsInput } from "@/features/tasks/utils/task-tags";

type TaskFormDialogProps = {
  onSubmitTask: (values: TaskFormValues) => void | Promise<void>;
  initialValues?: TaskFormValues;
  triggerLabel?: string;
  dialogEyebrow?: string;
  dialogTitle?: string;
  submitLabel?: string;
  triggerClassName?: string;
};

const createTaskDefaults: TaskFormValues = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  tags: "",
  dueDate: "",
};

const CREATE_DRAFT_STORAGE_KEY = "u-task-create-draft";

export function TaskFormDialog({
  onSubmitTask,
  initialValues,
  triggerLabel = "新建任务",
  dialogEyebrow = "创建任务",
  dialogTitle = "记下一条新的任务",
  submitLabel = "创建任务",
  triggerClassName,
}: TaskFormDialogProps) {
  const headingId = useId();
  const descriptionId = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPlanning, setShowPlanning] = useState(Boolean(initialValues));
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const dueDateInputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: initialValues ?? createTaskDefaults,
  });
  const values = watch();
  const dueDate = watch("dueDate");
  const tagPreview = parseTagsInput(watch("tags"));

  useEffect(() => {
    setMounted(true);

    return () => {
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    if (!open || !mounted) {
      return;
    }

    const root = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const rootOverflow = root.style.overflow;
    const bodyOverflow = body.style.overflow;
    const bodyPosition = body.style.position;
    const bodyTop = body.style.top;
    const bodyWidth = body.style.width;

    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    titleInputRef.current?.focus();

    return () => {
      root.style.overflow = rootOverflow;
      body.style.overflow = bodyOverflow;
      body.style.position = bodyPosition;
      body.style.top = bodyTop;
      body.style.width = bodyWidth;
      window.scrollTo({ top: scrollY, left: 0, behavior: "instant" });
    };
  }, [mounted, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        closeDialog();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSubmitting, open]);

  useEffect(() => {
    if (!open || initialValues || !isDirty) {
      return;
    }

    try {
      window.sessionStorage.setItem(CREATE_DRAFT_STORAGE_KEY, JSON.stringify(values));
      setHasSavedDraft(true);
    } catch {
      // Draft persistence should never block task entry.
    }
  }, [initialValues, isDirty, open, values]);

  const closeDialog = () => {
    if (isSubmitting) {
      return;
    }

    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const onSubmit = async (values: TaskFormValues) => {
    setSubmitError(null);

    try {
      await onSubmitTask({
        ...values,
        tags: formatTagsInput(parseTagsInput(values.tags)),
      });

      if (!initialValues) {
        window.sessionStorage.removeItem(CREATE_DRAFT_STORAGE_KEY);
        setHasSavedDraft(false);
      }

      reset(initialValues ?? createTaskDefaults);
      closeDialog();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "保存任务时出了点问题，稍后再试。");
    }
  };

  const openDialog = () => {
    let nextValues = initialValues ?? createTaskDefaults;

    if (!initialValues) {
      try {
        const savedDraft = window.sessionStorage.getItem(CREATE_DRAFT_STORAGE_KEY);

        if (savedDraft) {
          nextValues = { ...createTaskDefaults, ...JSON.parse(savedDraft) };
          setHasSavedDraft(true);
        } else {
          setHasSavedDraft(false);
        }
      } catch {
        setHasSavedDraft(false);
      }
    }

    reset(nextValues);
    setShowPlanning(Boolean(initialValues || nextValues.dueDate || nextValues.tags));
    setOpen(true);
  };

  const selectDueDate = (date: Date) => {
    setValue("dueDate", formatDateParam(date), { shouldDirty: true });
  };

  const clearDueDate = () => {
    setValue("dueDate", "", { shouldDirty: true });
  };

  const openDatePicker = () => {
    const input = dueDateInputRef.current;

    if (!input) {
      return;
    }

    input.focus();
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
      } catch {
        // The focused native input remains usable when a browser blocks showPicker().
      }
    }
  };

  const normalizeTags = () => {
    setValue("tags", formatTagsInput(parseTagsInput(values.tags)), { shouldDirty: true });
  };

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !dialogRef.current) {
      return;
    }

    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    const first = focusable[0];
    const last = focusable.at(-1);

    if (!first || !last) {
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDialog}
        className={triggerClassName ?? (
          triggerLabel === "新建任务"
            ? "tesla-action tesla-action--primary"
            : "tesla-action tesla-action--secondary"
        )}
      >
        {triggerLabel}
      </button>

      {open && mounted
        ? createPortal(
        <div
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) {
              closeDialog();
            }
          }}
          className="dialog-overlay"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            aria-describedby={descriptionId}
            className="task-dialog card-surface"
            data-lenis-prevent-wheel="true"
            onKeyDown={handleDialogKeyDown}
          >
            <div className="task-dialog__header">
              <div>
                <p className="section-eyebrow task-dialog__eyebrow">
                  {dialogEyebrow}
                </p>
                <h2 id={headingId} className="task-dialog__title">{dialogTitle}</h2>
                <p id={descriptionId} className="task-dialog__description">
                  {initialValues ? "调整任务内容与安排信息。" : "先写要完成的目标，详细信息可以稍后补充。"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                aria-label="关闭任务表单"
                className="dialog-close-button"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="task-dialog__form">
              {hasSavedDraft && !initialValues ? (
                <p className="task-dialog__draft-note" role="status">已恢复上次未完成的草稿。</p>
              ) : null}

              <section className="task-dialog__core" aria-label="任务内容">
                <Field label="任务名称" required error={errors.title?.message}>
                  <input
                    {...register("title")}
                    className="task-field"
                    ref={(node) => {
                      register("title").ref(node);
                      titleInputRef.current = node;
                    }}
                    placeholder="例如：完成项目说明文档初稿"
                    aria-label="任务名称"
                    aria-invalid={Boolean(errors.title)}
                  />
                </Field>

                <Field label="备注" optional error={errors.description?.message}>
                  <textarea
                    {...register("description")}
                    className="task-field task-textarea"
                    placeholder="任务的目标、实现过程或者方法，都可以写下补充说明。"
                    rows={3}
                    aria-label="备注"
                    aria-invalid={Boolean(errors.description)}
                  />
                </Field>
              </section>

              <button
                type="button"
                className={showPlanning ? "task-dialog__planning-toggle is-open" : "task-dialog__planning-toggle"}
                aria-label="具体描述"
                aria-expanded={showPlanning}
                onClick={() => setShowPlanning((current) => !current)}
              >
                <span>具体描述</span>
                <small>可选</small>
                <span className="task-dialog__planning-caret" aria-hidden="true" />
              </button>

              {showPlanning ? (
                <section className="task-dialog__planning" aria-label="具体描述设置">
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
                          <div className="task-priority-segment" role="group" aria-label="任务优先级">
                            {taskPriorityOptions.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                aria-pressed={field.value === option.value}
                                className={field.value === option.value ? `is-active is-active--${option.value}` : ""}
                                onClick={() => field.onChange(option.value)}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}
                      />
                    </Field>
                  </div>

                  <Field label="标签" optional error={errors.tags?.message}>
                    <input
                      {...register("tags")}
                      className="task-field"
                      placeholder="例如：设计，首屏，移动端"
                      onBlur={normalizeTags}
                      aria-invalid={Boolean(errors.tags)}
                    />
                  </Field>
                  {tagPreview.length ? (
                    <div className="task-dialog__tag-preview" aria-label="已添加标签">
                      {tagPreview.map((tag) => <span key={tag}>{tag}</span>)}
                    </div>
                  ) : null}

                  <section className="task-dialog__schedule" aria-labelledby={`${headingId}-due-date`}>
                    <div className="task-dialog__schedule-head">
                      <div>
                        <span id={`${headingId}-due-date`} className="task-dialog__label">截止日期</span>
                        <small>可选</small>
                      </div>
                      {dueDate ? <button type="button" onClick={clearDueDate}>清除</button> : null}
                    </div>
                    <div className="task-date-presets" role="group" aria-label="截止日期快捷选择">
                      <button type="button" className={dueDate === formatDateParam(new Date()) ? "is-active" : ""} onClick={() => selectDueDate(new Date())}>今天</button>
                      <button type="button" className={dueDate === formatDateParam(addDays(new Date(), 1)) ? "is-active" : ""} onClick={() => selectDueDate(addDays(new Date(), 1))}>明天</button>
                      <button type="button" className={dueDate === formatDateParam(getNextMonday()) ? "is-active" : ""} onClick={() => selectDueDate(getNextMonday())}>下周一</button>
                    </div>
                    <div className="task-date-picker" onClick={openDatePicker}>
                      <input
                        type="date"
                        {...register("dueDate")}
                        ref={(node) => {
                          register("dueDate").ref(node);
                          dueDateInputRef.current = node;
                        }}
                        className="task-field task-date"
                        aria-label="自定义截止日期"
                        aria-invalid={Boolean(errors.dueDate)}
                      />
                    </div>
                  </section>
                </section>
              ) : null}

              <div className="task-dialog__actions">
                <button
                  type="button"
                  onClick={closeDialog}
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

function Field({
  label,
  required = false,
  optional = false,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="task-dialog__field">
      <span className="task-dialog__label">
        {label}
        {required ? <small>必填</small> : null}
        {optional ? <small>可选</small> : null}
      </span>
      {children}
      {error ? <span className="task-dialog__error" role="alert">{error}</span> : null}
    </label>
  );
}

const taskStatusOptions: Array<CustomSelectOption<TaskFormValues["status"]>> = [
  { value: "todo", label: "待开始", description: "还没动手" },
  { value: "in_progress", label: "进行中", description: "已经开始处理" },
  { value: "done", label: "已完成", description: "这条已经做完" },
];

const taskPriorityOptions: Array<CustomSelectOption<TaskFormValues["priority"]>> = [
  { value: "low", label: "低", description: "可以晚点看" },
  { value: "medium", label: "中", description: "正常推进就好" },
  { value: "high", label: "高", description: "建议先安排" },
];

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function getNextMonday() {
  const today = new Date();
  const daysUntilMonday = ((8 - today.getDay()) % 7) || 7;
  return addDays(today, daysUntilMonday);
}

function formatDateParam(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const date = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}
