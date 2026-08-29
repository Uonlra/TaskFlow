"use client";

import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { CustomSelect, type CustomSelectOption } from "@/shared/components/common/custom-select";
import { taskSchema, type TaskFormValues } from "@/features/tasks/schemas/task-schema";
import { formatTagsInput, parseTagsInput } from "@/features/tasks/utils/task-tags";

type TaskFormDialogProps = {
  onSubmitTask: (values: TaskFormValues) => void | Promise<void>;
  initialValues?: TaskFormValues;
  createDefaults?: Partial<TaskFormValues>;
  triggerLabel?: string;
  triggerAriaLabel?: string;
  triggerIconOnly?: boolean;
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
  createDefaults,
  triggerLabel = "新建任务",
  triggerAriaLabel,
  triggerIconOnly = false,
  dialogEyebrow = "创建任务",
  dialogTitle = "记下一条新的任务",
  submitLabel = "创建任务",
  triggerClassName,
}: TaskFormDialogProps) {
  const createValues = { ...createTaskDefaults, ...createDefaults };
  const headingId = useId();
  const descriptionId = useId();
  const titleErrorId = `${headingId}-title-error`;
  const descriptionErrorId = `${headingId}-description-error`;
  const statusErrorId = `${headingId}-status-error`;
  const priorityErrorId = `${headingId}-priority-error`;
  const tagsErrorId = `${headingId}-tags-error`;
  const dueDateErrorId = `${headingId}-due-date-error`;
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPlanning, setShowPlanning] = useState(Boolean(initialValues));
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [isDateCalendarOpen, setIsDateCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [calendarPosition, setCalendarPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dueDateInputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const dateComposerRef = useRef<HTMLDivElement | null>(null);
  const dateCalendarTriggerRef = useRef<HTMLButtonElement | null>(null);
  const dateCalendarRef = useRef<HTMLDivElement | null>(null);
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
    defaultValues: initialValues ?? createValues,
  });
  const values = watch();
  const dueDate = watch("dueDate");
  const description = watch("description");
  const tagPreview = parseTagsInput(watch("tags"));
  const dueDateField = register("dueDate");
  const today = startOfDay(new Date());
  const selectedDueDate = parseDateParam(dueDate ?? "");
  const visibleWeek = Array.from({ length: 7 }, (_, index) => addDays(today, index));
  const calendarDays = getCalendarDays(calendarMonth);

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
    const textarea = descriptionTextareaRef.current;

    if (!open || !textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [description, open]);

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
    if (!isDateCalendarOpen) {
      return;
    }

    const closeCalendarOnOutsidePress = (event: PointerEvent) => {
      if (!dateComposerRef.current?.contains(event.target as Node)) {
        setIsDateCalendarOpen(false);
        setCalendarPosition(null);
      }
    };

    document.addEventListener("pointerdown", closeCalendarOnOutsidePress);

    return () => {
      document.removeEventListener("pointerdown", closeCalendarOnOutsidePress);
    };
  }, [isDateCalendarOpen]);

  useEffect(() => {
    if (!open || !isDateCalendarOpen) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(updateDateCalendarPosition);
    const dialog = dialogRef.current;

    window.addEventListener("resize", updateDateCalendarPosition);
    window.addEventListener("scroll", updateDateCalendarPosition, true);
    dialog?.addEventListener("scroll", updateDateCalendarPosition);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", updateDateCalendarPosition);
      window.removeEventListener("scroll", updateDateCalendarPosition, true);
      dialog?.removeEventListener("scroll", updateDateCalendarPosition);
    };
  }, [isDateCalendarOpen, open]);

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

      reset(initialValues ?? createValues);
      closeDialog();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "保存任务时出了点问题，稍后再试。");
    }
  };

  const openDialog = () => {
    let nextValues = initialValues ?? createValues;

    if (!initialValues) {
      try {
        const savedDraft = window.sessionStorage.getItem(CREATE_DRAFT_STORAGE_KEY);

        if (savedDraft) {
          nextValues = { ...createTaskDefaults, ...JSON.parse(savedDraft), ...createDefaults };
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
    setCalendarMonth(startOfMonth(parseDateParam(nextValues.dueDate ?? "") ?? new Date()));
    setIsDateCalendarOpen(false);
    setCalendarPosition(null);
    setOpen(true);
  };

  const selectDueDate = (date: Date) => {
    setValue("dueDate", formatDateParam(date), { shouldDirty: true });
    setCalendarMonth(startOfMonth(date));
    setIsDateCalendarOpen(false);
    setCalendarPosition(null);
  };

  const clearDueDate = () => {
    setValue("dueDate", "", { shouldDirty: true });
    setIsDateCalendarOpen(false);
    setCalendarPosition(null);
  };

  const openNativeDatePicker = () => {
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

  const openDatePicker = () => {
    const shouldUseNativePicker = window.matchMedia?.("(max-width: 767px), (pointer: coarse)").matches;

    if (shouldUseNativePicker) {
      openNativeDatePicker();
      return;
    }

    if (isDateCalendarOpen) {
      setIsDateCalendarOpen(false);
      setCalendarPosition(null);
      return;
    }

    setCalendarMonth(startOfMonth(selectedDueDate ?? new Date()));
    updateDateCalendarPosition();
    setIsDateCalendarOpen(true);
  };

  const updateDateCalendarPosition = () => {
    const trigger = dateCalendarTriggerRef.current;

    if (!trigger) {
      return;
    }

    const viewportPadding = 12;
    const calendarWidth = Math.min(342, window.innerWidth - viewportPadding * 2);
    const calendarHeight = dateCalendarRef.current?.offsetHeight ?? 346;
    const triggerBounds = trigger.getBoundingClientRect();
    const top = Math.max(viewportPadding, triggerBounds.top - calendarHeight - 8);
    const left = Math.min(
      Math.max(viewportPadding, triggerBounds.right - calendarWidth),
      window.innerWidth - calendarWidth - viewportPadding,
    );

    setCalendarPosition({ top, left, width: calendarWidth });
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

  const triggerClasses = [
    triggerClassName ??
      (triggerLabel === "新建任务" ? "tesla-action tesla-action--primary" : "tesla-action tesla-action--secondary"),
    triggerIconOnly ? "task-dialog__trigger--icon-only" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDialog}
        className={triggerClasses}
        aria-label={triggerIconOnly ? (triggerAriaLabel ?? triggerLabel) : undefined}
        title={triggerIconOnly ? (triggerAriaLabel ?? triggerLabel) : undefined}
      >
        {triggerIconOnly ? <span aria-hidden="true">+</span> : triggerLabel}
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
                    <p className="section-eyebrow task-dialog__eyebrow">{dialogEyebrow}</p>
                    <h2 id={headingId} className="task-dialog__title">
                      {dialogTitle}
                    </h2>
                    <p id={descriptionId} className="task-dialog__description">
                      {initialValues ? "调整任务内容与安排信息。" : "先写要完成的目标，详细信息可以稍后补充。"}
                    </p>
                  </div>
                  <button type="button" onClick={closeDialog} aria-label="关闭任务表单" className="dialog-close-button">
                    ×
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="task-dialog__form">
                  {hasSavedDraft && !initialValues ? (
                    <p className="task-dialog__draft-note" role="status">
                      已恢复上次未完成的草稿。
                    </p>
                  ) : null}

                  <section className="task-dialog__core" aria-label="任务内容">
                    <Field label="任务名称" required error={errors.title?.message} errorId={titleErrorId}>
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
                        aria-describedby={errors.title ? titleErrorId : undefined}
                      />
                    </Field>

                    <Field label="备注" optional error={errors.description?.message} errorId={descriptionErrorId}>
                      <textarea
                        {...register("description")}
                        className="task-field task-textarea"
                        ref={(node) => {
                          register("description").ref(node);
                          descriptionTextareaRef.current = node;
                        }}
                        placeholder="任务的目标、实现过程或者方法，都可以写下补充说明。"
                        rows={1}
                        aria-label="备注"
                        aria-invalid={Boolean(errors.description)}
                        aria-describedby={errors.description ? descriptionErrorId : undefined}
                        onInput={(event) => {
                          const textarea = event.currentTarget;
                          textarea.style.height = "auto";
                          textarea.style.height = `${textarea.scrollHeight}px`;
                        }}
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
                        <Field label="状态" error={errors.status?.message} errorId={statusErrorId}>
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
                                ariaDescribedBy={errors.status ? statusErrorId : undefined}
                              />
                            )}
                          />
                        </Field>

                        <Field label="优先级" error={errors.priority?.message} errorId={priorityErrorId}>
                          <Controller
                            control={control}
                            name="priority"
                            render={({ field }) => (
                              <div
                                className="task-priority-segment"
                                role="group"
                                aria-label="任务优先级"
                                aria-invalid={Boolean(errors.priority)}
                                aria-describedby={errors.priority ? priorityErrorId : undefined}
                              >
                                {taskPriorityOptions.map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    aria-pressed={field.value === option.value}
                                    className={
                                      field.value === option.value ? `is-active is-active--${option.value}` : ""
                                    }
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

                      <Field label="标签" optional error={errors.tags?.message} errorId={tagsErrorId}>
                        <input
                          {...register("tags")}
                          className="task-field"
                          placeholder="例如：设计，首屏，移动端"
                          onBlur={normalizeTags}
                          aria-invalid={Boolean(errors.tags)}
                          aria-describedby={errors.tags ? tagsErrorId : undefined}
                        />
                      </Field>
                      {tagPreview.length ? (
                        <div className="task-dialog__tag-preview" aria-label="已添加标签">
                          {tagPreview.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                      ) : null}

                      <section className="task-dialog__schedule" aria-labelledby={`${headingId}-due-date`}>
                        <div className="task-dialog__schedule-head">
                          <div>
                            <span id={`${headingId}-due-date`} className="task-dialog__label">
                              截止日期
                            </span>
                            <small>可选</small>
                          </div>
                          {dueDate ? (
                            <button type="button" onClick={clearDueDate}>
                              清除
                            </button>
                          ) : null}
                        </div>
                        <div ref={dateComposerRef} className="task-date-composer">
                          <div
                            className={selectedDueDate ? "task-date-summary is-selected" : "task-date-summary"}
                            role="status"
                          >
                            <span className="task-date-summary__day">
                              {selectedDueDate ? selectedDueDate.getDate() : "--"}
                            </span>
                            <span className="task-date-summary__month">
                              {selectedDueDate ? `${selectedDueDate.getMonth() + 1}月` : "日期"}
                            </span>
                            <span className="task-date-summary__content">
                              <strong>
                                {selectedDueDate ? getRelativeDateLabel(selectedDueDate, today) : "暂不设置日期"}
                              </strong>
                              <small>
                                {selectedDueDate ? formatDateDescription(selectedDueDate) : "需要时再为任务安排时间"}
                              </small>
                            </span>
                          </div>

                          <div className="task-date-rail" role="group" aria-label="未来七天">
                            {visibleWeek.map((date) => {
                              const isSelected = isSameDate(date, selectedDueDate);
                              const relativeLabel = getRelativeDateLabel(date, today);

                              return (
                                <button
                                  key={formatDateParam(date)}
                                  type="button"
                                  aria-label={`${formatDateDescription(date)}，${relativeLabel}`}
                                  aria-pressed={isSelected}
                                  className={isSelected ? "is-active" : ""}
                                  onClick={() => selectDueDate(date)}
                                >
                                  <span>{getWeekdayLabel(date)}</span>
                                  <strong>{date.getDate()}</strong>
                                </button>
                              );
                            })}
                          </div>

                          <div className="task-date-picker">
                            <button
                              ref={dateCalendarTriggerRef}
                              type="button"
                              className="task-date-picker__trigger"
                              aria-expanded={isDateCalendarOpen}
                              aria-haspopup="dialog"
                              onClick={openDatePicker}
                            >
                              选择具体日期
                            </button>
                            <input
                              type="date"
                              {...dueDateField}
                              ref={(node) => {
                                dueDateField.ref(node);
                                dueDateInputRef.current = node;
                              }}
                              className="task-date task-date-picker__native-input"
                              tabIndex={-1}
                              aria-hidden="true"
                              aria-invalid={Boolean(errors.dueDate)}
                              aria-describedby={errors.dueDate ? dueDateErrorId : undefined}
                              onChange={(event) => {
                                dueDateField.onChange(event);
                                setIsDateCalendarOpen(false);
                                setCalendarPosition(null);
                              }}
                            />
                          </div>

                          {isDateCalendarOpen ? (
                            <div
                              className="task-date-calendar"
                              role="dialog"
                              aria-label="选择截止日期"
                              ref={dateCalendarRef}
                              style={calendarPosition ?? undefined}
                              onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setIsDateCalendarOpen(false);
                                  setCalendarPosition(null);
                                  dateCalendarTriggerRef.current?.focus();
                                }
                              }}
                            >
                              <div className="task-date-calendar__head">
                                <button
                                  type="button"
                                  aria-label="上个月"
                                  onClick={() => setCalendarMonth((current) => shiftMonth(current, -1))}
                                >
                                  &lt;
                                </button>
                                <strong>
                                  {calendarMonth.getFullYear()}年{calendarMonth.getMonth() + 1}月
                                </strong>
                                <button
                                  type="button"
                                  aria-label="下个月"
                                  onClick={() => setCalendarMonth((current) => shiftMonth(current, 1))}
                                >
                                  &gt;
                                </button>
                              </div>
                              <div className="task-date-calendar__weekdays" aria-hidden="true">
                                {weekdayLabels.map((weekday) => (
                                  <span key={weekday}>{weekday}</span>
                                ))}
                              </div>
                              <div
                                className="task-date-calendar__days"
                                role="grid"
                                aria-label={`${calendarMonth.getFullYear()}年${calendarMonth.getMonth() + 1}月`}
                              >
                                {calendarDays.map((date) => {
                                  const isCurrentMonth = date.getMonth() === calendarMonth.getMonth();
                                  const isSelected = isSameDate(date, selectedDueDate);
                                  const isToday = isSameDate(date, today);

                                  return (
                                    <button
                                      key={formatDateParam(date)}
                                      type="button"
                                      role="gridcell"
                                      aria-label={`选择 ${formatDateDescription(date)}`}
                                      aria-selected={isSelected}
                                      className={`${isCurrentMonth ? "" : "is-outside"}${isSelected ? " is-selected" : ""}${isToday ? " is-today" : ""}`}
                                      onClick={() => selectDueDate(date)}
                                    >
                                      {date.getDate()}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>
                        {errors.dueDate ? (
                          <span id={dueDateErrorId} className="task-dialog__error" role="alert">
                            {errors.dueDate.message}
                          </span>
                        ) : null}
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
                    <button type="submit" disabled={isSubmitting} className="tesla-action tesla-action--primary">
                      {isSubmitting ? "保存中..." : submitLabel}
                    </button>
                  </div>
                  {submitError ? (
                    <p className="task-dialog__error" role="alert">
                      {submitError}
                    </p>
                  ) : null}
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
  errorId,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  errorId?: string;
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
      {error ? (
        <span id={errorId} className="task-dialog__error" role="alert">
          {error}
        </span>
      ) : null}
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

const weekdayLabels = ["一", "二", "三", "四", "五", "六", "日"];

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function parseDateParam(value: string) {
  if (!value) {
    return null;
  }

  const [year, month, date] = value.split("-").map(Number);

  if (!year || !month || !date) {
    return null;
  }

  return new Date(year, month - 1, date);
}

function isSameDate(first: Date, second: Date | null) {
  if (!second) {
    return false;
  }

  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function getWeekdayLabel(date: Date) {
  return weekdayLabels[(date.getDay() + 6) % 7];
}

function getRelativeDateLabel(date: Date, today: Date) {
  const difference = Math.round((startOfDay(date).getTime() - today.getTime()) / 86_400_000);

  if (difference === 0) {
    return "今天";
  }

  if (difference === 1) {
    return "明天";
  }

  if (difference === -1) {
    return "昨天";
  }

  return `周${getWeekdayLabel(date)}`;
}

function formatDateDescription(date: Date) {
  return `${date.getMonth() + 1}月${date.getDate()}日，星期${getWeekdayLabel(date)}`;
}

function getCalendarDays(month: Date) {
  const firstDay = startOfMonth(month);
  const offset = (firstDay.getDay() + 6) % 7;
  const gridStart = addDays(firstDay, -offset);

  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function formatDateParam(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const date = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}
