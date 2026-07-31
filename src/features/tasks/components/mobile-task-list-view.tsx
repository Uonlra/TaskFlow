"use client";

import Link from "next/link";

import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";
import type { TaskFilters } from "@/features/tasks/components/task-filter-bar";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";
import { ROUTES } from "@/shared/lib/constants/routes";

type MobileTaskListViewProps = {
  tasks: Task[];
  totalCount: number;
  filters: TaskFilters;
  isLoading: boolean;
  onFiltersChange: (filters: TaskFilters) => void;
  onCreateTask: (values: TaskFormValues) => void | Promise<void>;
  onUpdateStatus: (id: string, status: Task["status"]) => void | Promise<void>;
};

type QuickFilter = {
  key: string;
  label: string;
  filters: Partial<TaskFilters>;
};

const quickFilters: QuickFilter[] = [
  { key: "today", label: "今天", filters: { status: "all", sort: "due_asc" } },
  { key: "upcoming", label: "即将", filters: { status: "all", sort: "due_asc" } },
  { key: "project", label: "项目", filters: { status: "all", sort: "priority_desc" } },
  { key: "done", label: "已完成", filters: { status: "done", sort: "updated_desc" } },
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
  filters,
  isLoading,
  onFiltersChange,
  onCreateTask,
  onUpdateStatus,
}: MobileTaskListViewProps) {
  const openCount = tasks.filter((task) => task.status !== "done").length;
  const doneCount = tasks.filter((task) => task.status === "done").length;
  const highCount = tasks.filter((task) => task.status !== "done" && task.priority === "high").length;
  const selectedQuickFilter = getSelectedQuickFilter(filters);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, query: value });
  };

  const handleQuickFilter = (item: QuickFilter) => {
    onFiltersChange({
      ...filters,
      query: item.key === "project" ? filters.query : "",
      tag: item.key === "project" ? filters.tag : "",
      priority: "all",
      due: "",
      risk: "",
      date: "",
      range: "",
      ...item.filters,
    });
  };

  return (
    <section className="mobile-task-list" aria-label="移动端任务列表">
      <header className="mobile-page-header mobile-task-list__header">
        <div className="mobile-page-header__copy">
          <p>{isLoading ? "同步中" : `${totalCount} 项`}</p>
          <h1>任务</h1>
        </div>
        <TaskFormDialog onSubmitTask={onCreateTask} triggerLabel="新增" />
      </header>

      <label className="mobile-task-list__search">
        <span aria-hidden="true" />
        <input
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
          tasks.map((task) => <MobileTaskItem key={task.id} task={task} onUpdateStatus={onUpdateStatus} />)
        ) : (
          <div className="mobile-task-list__empty mobile-empty-state">
            <strong>没有任务</strong>
            <span>换个筛选</span>
          </div>
        )}
      </div>
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

function MobileTaskItem({ task, onUpdateStatus }: { task: Task; onUpdateStatus: (id: string, status: Task["status"]) => void | Promise<void> }) {
  const dueMeta = getTaskDueMeta(task);
  const nextStatus = task.status === "done" ? "todo" : "done";

  return (
    <article className={`mobile-task-item mobile-task-item--${task.priority}${task.status === "done" ? " mobile-task-item--done" : ""}`}>
      <button
        type="button"
        className="mobile-task-item__check"
        aria-label={task.status === "done" ? "标记为未完成" : "标记为完成"}
        aria-pressed={task.status === "done"}
        onClick={() => onUpdateStatus(task.id, nextStatus)}
      />
      <Link href={`${ROUTES.tasks}/${task.id}`} className="mobile-task-item__body">
        <span className="mobile-task-item__main">
          <strong>{task.title}</strong>
          <small>{formatTaskMeta(task, dueMeta.label)}</small>
        </span>
        <span className="mobile-task-item__meta">
          <span className="mobile-task-item__priority">{priorityLabel[task.priority]}</span>
          {task.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="mobile-task-item__tag">#{tag}</span>
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

  if (filters.sort === "priority_desc") {
    return "project";
  }

  return "today";
}

function formatTaskMeta(task: Task, dueLabel: string) {
  const parts = [dueLabel, statusLabel[task.status]];

  if (task.tags.length > 2) {
    parts.push(`${task.tags.length} 标签`);
  }

  return parts.join(" · ");
}
