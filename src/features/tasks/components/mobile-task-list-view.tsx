"use client";

import Link from "next/link";

import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";
import type { TaskFilters } from "@/features/tasks/types/task-filters";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";
import { TASK_DUE_FILTERS } from "@/shared/lib/constants/query-params";
import { ROUTES } from "@/shared/lib/constants/routes";
import type { TaskCategoryCounts } from "@/features/tasks/utils/task-list-query";
import { MobileTaskListSkeleton } from "@/features/tasks/components/task-page-skeleton";
import { PageToolbar } from "@/shared/components/layout/page-toolbar";

type MobileTaskListViewProps = {
  tasks: Task[];
  totalCount: number;
  categoryCounts?: TaskCategoryCounts;
  page?: number;
  pageSize?: number;
  hasNext?: boolean;
  filters: TaskFilters;
  isLoading: boolean;
  onFiltersChange: (filters: TaskFilters) => void;
  onPageChange?: (page: number) => void;
  onCreateTask: (values: TaskFormValues) => void | Promise<void>;
  onUpdateStatus: (id: string, status: Task["status"]) => void | Promise<void>;
  onPreviewTask?: (task: Task) => void;
};

type QuickFilter = {
  key: string;
  label: string;
  filters: Partial<TaskFilters>;
};

const quickFilters: QuickFilter[] = [
  { key: "near", label: "近期", filters: { status: "active", due: TASK_DUE_FILTERS.near, sort: "due_asc" } },
  { key: "active", label: "未完成", filters: { status: "active", due: "", sort: "due_asc" } },
  { key: "done", label: "已完成", filters: { status: "done", due: "", sort: "updated_desc" } },
  { key: "all", label: "全部", filters: { status: "all", due: "", sort: "due_asc" } },
];

const priorityLabel: Record<Task["priority"], string> = {
  high: "高",
  medium: "中",
  low: "低",
};

const statusLabel: Record<Task["status"], string> = {
  todo: "待办",
  in_progress: "进行中",
  done: "完成",
};

export function MobileTaskListView({
  tasks,
  totalCount,
  categoryCounts,
  page = 1,
  pageSize = 50,
  hasNext = false,
  filters,
  isLoading,
  onFiltersChange,
  onPageChange,
  onCreateTask,
  onUpdateStatus,
  onPreviewTask = () => {},
}: MobileTaskListViewProps) {
  const openCount = categoryCounts?.active ?? tasks.filter((task) => task.status !== "done").length;
  const doneCount = categoryCounts?.done ?? tasks.filter((task) => task.status === "done").length;
  const highCount = tasks.filter((task) => task.status !== "done" && task.priority === "high").length;
  const selectedQuickFilter = getSelectedQuickFilter(filters);

  if (isLoading && !totalCount && !tasks.length) {
    return <MobileTaskListSkeleton />;
  }

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, query: value });
  };

  const handleQuickFilter = (item: QuickFilter) => {
    onFiltersChange({
      ...filters,
      query: "",
      tag: "",
      priority: "all",
      due: "",
      risk: "",
      date: "",
      range: "",
      ...item.filters,
    });
  };

  return (
    <section
      className={isLoading ? "mobile-task-list mobile-task-list--refreshing" : "mobile-task-list"}
      aria-label="移动端任务列表"
      aria-busy={isLoading}
    >
      <PageToolbar
        accessibleTitle="任务"
        className="mobile-task-list__toolbar"
        context={<span className="mobile-task-list__count">{isLoading ? "同步中" : `${totalCount} 项`}</span>}
        primaryAction={
          <TaskFormDialog
            onSubmitTask={onCreateTask}
            triggerLabel="新增"
            triggerAriaLabel="新增任务"
            triggerIconOnly
            triggerClassName="mobile-add-task-button tesla-action tesla-action--primary"
          />
        }
      />

      <label className="mobile-task-list__search">
        <span aria-hidden="true" />
        <input
          type="search"
          value={filters.query}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="搜索任务、标签"
          aria-label="搜索任务"
        />
      </label>

      <nav className="mobile-task-list__chips" aria-label="任务分类">
        {quickFilters.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={selectedQuickFilter === item.key}
            className={selectedQuickFilter === item.key ? "mobile-task-list__chip is-active" : "mobile-task-list__chip"}
            onClick={() => handleQuickFilter(item)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mobile-task-list__stats" aria-label="任务统计">
        <StatItem label="待办" value={openCount} />
        <StatItem label="完成" value={doneCount} />
        <StatItem label="高优先" value={highCount} />
      </div>

      <div className="mobile-task-list__items">
        {tasks.length ? (
          tasks.map((task) => (
            <MobileTaskItem key={task.id} task={task} onUpdateStatus={onUpdateStatus} onPreviewTask={onPreviewTask} />
          ))
        ) : (
          <div className="mobile-task-list__empty mobile-empty-state">
            <strong>没有任务</strong>
            <span>换个筛选</span>
          </div>
        )}
      </div>
      {onPageChange && totalCount > pageSize ? (
        <nav className="task-pagination task-pagination--mobile" aria-label="任务分页">
          <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            上一页
          </button>
          <span>
            第 {page} / {Math.max(1, Math.ceil(totalCount / pageSize))} 页
          </span>
          <button type="button" disabled={!hasNext} onClick={() => onPageChange(page + 1)}>
            下一页
          </button>
        </nav>
      ) : null}
    </section>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <span className="mobile-task-list__stat">
      <strong>{value}</strong>
      <small>{label}</small>
    </span>
  );
}

function MobileTaskItem({
  task,
  onUpdateStatus,
  onPreviewTask,
}: {
  task: Task;
  onUpdateStatus: (id: string, status: Task["status"]) => void | Promise<void>;
  onPreviewTask: (task: Task) => void;
}) {
  const dueMeta = getTaskDueMeta(task);
  const nextStatus = task.status === "done" ? "todo" : "done";

  return (
    <article
      className={`mobile-task-item mobile-task-item--${task.priority}${task.status === "done" ? " mobile-task-item--done" : ""}`}
    >
      <button
        type="button"
        className="mobile-task-item__check"
        aria-label={task.status === "done" ? "标记为未完成" : "标记为完成"}
        aria-pressed={task.status === "done"}
        onClick={() => onUpdateStatus(task.id, nextStatus)}
      />
      <Link
        href={`${ROUTES.tasks}/${task.id}`}
        className="mobile-task-item__body"
        onClick={(event) => {
          event.preventDefault();
          onPreviewTask(task);
        }}
      >
        <span className="mobile-task-item__main">
          <strong>{task.title}</strong>
          <small>{formatTaskMeta(task, dueMeta.label)}</small>
        </span>
        <span className="mobile-task-item__meta">
          <span className="mobile-task-item__priority">{priorityLabel[task.priority]}</span>
          {task.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="mobile-task-item__tag">
              #{tag}
            </span>
          ))}
        </span>
      </Link>
    </article>
  );
}

function getSelectedQuickFilter(filters: TaskFilters) {
  if (filters.status === "done") {
    return "done";
  }

  if (filters.due === TASK_DUE_FILTERS.near) {
    return "near";
  }

  if (filters.status === "active") {
    return "active";
  }

  if (
    filters.query === "" &&
    filters.tag === "" &&
    filters.status === "all" &&
    filters.priority === "all" &&
    filters.due === "" &&
    filters.risk === "" &&
    filters.date === "" &&
    filters.range === ""
  ) {
    return "all";
  }

  return "";
}

function formatTaskMeta(task: Task, dueLabel: string) {
  const parts = [dueLabel, statusLabel[task.status]];

  if (task.tags.length > 2) {
    parts.push(`${task.tags.length} 标签`);
  }

  return parts.join(" · ");
}
