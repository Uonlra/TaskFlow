"use client";

import type { ChangeEvent, CSSProperties, ReactNode } from "react";

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
  onChange: (next: TaskFilters) => void;
};

export function TaskFilterBar({ filters, onChange }: TaskFilterBarProps) {
  const updateField =
    (field: keyof TaskFilters) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      onChange({
        ...filters,
        [field]: event.target.value,
      } as TaskFilters);
    };

  return (
    <section
      className="card-surface"
      style={{
        borderRadius: 28,
        padding: 22,
      }}
    >
      <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        <p className="section-eyebrow" style={{ margin: 0, color: "var(--primary)", fontWeight: 700, fontSize: "0.82rem" }}>
          筛选工具
        </p>
        <p style={{ margin: 0, color: "var(--muted-strong)", lineHeight: 1.75 }}>
          通过关键词、标签、优先级和排序方式，把当前任务列表收束成清楚的工作视图。
        </p>
      </div>

      <div className="task-filter-grid">
        <FilterField label="搜索">
          <input value={filters.query} onChange={updateField("query")} placeholder="搜索任务关键词" style={controlStyle} />
        </FilterField>

        <FilterField label="标签">
          <input value={filters.tag} onChange={updateField("tag")} placeholder="按标签筛选" style={controlStyle} />
        </FilterField>

        <FilterField label="状态">
          <select value={filters.status} onChange={updateField("status")} style={controlStyle}>
            <option value="all">全部状态</option>
            <option value="todo">待开始</option>
            <option value="in_progress">进行中</option>
            <option value="done">已完成</option>
          </select>
        </FilterField>

        <FilterField label="优先级">
          <select value={filters.priority} onChange={updateField("priority")} style={controlStyle}>
            <option value="all">全部优先级</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </FilterField>

        <FilterField label="排序">
          <select value={filters.sort} onChange={updateField("sort")} style={controlStyle}>
            <option value="created_desc">按创建时间</option>
            <option value="updated_desc">按最近更新</option>
            <option value="due_asc">按截止时间</option>
            <option value="priority_desc">按优先级</option>
          </select>
        </FilterField>
      </div>
    </section>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span className="ui-sans" style={{ fontSize: "0.9rem", color: "var(--muted)", fontWeight: 600 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const controlStyle = {
  borderRadius: 16,
  border: "1px solid var(--border)",
  padding: "14px 16px",
  background: "rgba(255,255,255,0.8)",
  color: "var(--foreground)",
} satisfies CSSProperties;
