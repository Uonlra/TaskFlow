"use client";

import type { ChangeEvent, ReactNode } from "react";

import {
  CustomSelect,
  type CustomSelectOption,
} from "@/components/common/custom-select";
import type { TaskPriority, TaskStatus } from "@/features/tasks/types/task.types";
import type { TaskSort } from "@/features/tasks/utils/task-deadline";

export type TaskFilters = {
  query: string;
  tag: string;
  status: TaskStatus | "all";
  priority: TaskPriority | "all";
  sort: TaskSort;
};

type TaskFilterBarProps = {
  filters: TaskFilters;
  resultCount: number;
  totalCount: number;
  onChange: (next: TaskFilters) => void;
  onReset: () => void;
};

export function TaskFilterBar({
  filters,
  resultCount,
  totalCount,
  onChange,
  onReset,
}: TaskFilterBarProps) {
  const hasActiveFilters =
    filters.query.trim() !== "" ||
    filters.tag.trim() !== "" ||
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.sort !== "due_asc";

  const updateField =
    (field: keyof TaskFilters) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      onChange({
        ...filters,
        [field]: event.target.value,
      } as TaskFilters);
    };

  return (
    <section className="task-filter card-surface">
      <div className="task-filter__header">
        <div className="task-filter__copy">
          <div>
            <p className="section-eyebrow task-filter__eyebrow">
              筛选工具
            </p>
            <p className="task-filter__description">
              通过关键词、标签、优先级和排序方式，把当前任务列表收束成清楚的工作视图。
            </p>
          </div>
          <div className="task-filter__meta">
            <span className="task-filter__count">
              当前结果 {resultCount} / {totalCount}
            </span>
            {hasActiveFilters ? (
              <button type="button" onClick={onReset} className="tesla-action tesla-action--secondary">
                清空筛选
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="task-filter-grid">
        <FilterField label="搜索">
          <input
            value={filters.query}
            onChange={updateField("query")}
            className="task-field"
            placeholder="搜索任务关键词"
          />
        </FilterField>

        <FilterField label="标签">
          <input
            value={filters.tag}
            onChange={updateField("tag")}
            className="task-field"
            placeholder="按标签筛选"
          />
        </FilterField>

        <FilterField label="状态">
          <CustomSelect
            ariaLabel="任务状态筛选"
            value={filters.status}
            options={statusOptions}
            onChange={(value) => onChange({ ...filters, status: value })}
          />
        </FilterField>

        <FilterField label="优先级">
          <CustomSelect
            ariaLabel="任务优先级筛选"
            value={filters.priority}
            options={priorityOptions}
            onChange={(value) => onChange({ ...filters, priority: value })}
          />
        </FilterField>

        <FilterField label="排序">
          <CustomSelect
            ariaLabel="任务排序方式"
            value={filters.sort}
            options={sortOptions}
            onChange={(value) => onChange({ ...filters, sort: value })}
          />
        </FilterField>
      </div>
    </section>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="task-filter__field">
      <span className="task-filter__label">
        {label}
      </span>
      {children}
    </label>
  );
}

const statusOptions: Array<CustomSelectOption<TaskStatus | "all">> = [
  { value: "all", label: "全部状态", description: "查看所有任务" },
  { value: "todo", label: "待开始", description: "还没动手的任务" },
  { value: "in_progress", label: "进行中", description: "当前正在推进" },
  { value: "done", label: "已完成", description: "已经处理完成" },
];

const priorityOptions: Array<CustomSelectOption<TaskPriority | "all">> = [
  { value: "all", label: "全部优先级", description: "不过滤优先级" },
  { value: "high", label: "高", description: "需要优先收口" },
  { value: "medium", label: "中", description: "常规推进事项" },
  { value: "low", label: "低", description: "可以延后处理" },
];

const sortOptions: Array<CustomSelectOption<TaskSort>> = [
  { value: "due_asc", label: "按截止时间", description: "先看最接近截止的任务" },
  { value: "updated_desc", label: "按最近更新", description: "先看最近有变化的任务" },
  { value: "created_desc", label: "按创建时间", description: "先看最近新加入的任务" },
  { value: "priority_desc", label: "按优先级", description: "先看高优先级任务" },
];
