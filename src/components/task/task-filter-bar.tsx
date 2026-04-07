"use client";

import type { ChangeEvent } from "react";

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
        padding: 20,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 16,
      }}
    >
      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontSize: "0.9rem", color: "var(--muted)", fontWeight: 600 }}>搜索</span>
        <input
          value={filters.query}
          onChange={updateField("query")}
          placeholder="搜索任务关键词"
          style={{
            borderRadius: 16,
            border: "1px solid var(--border)",
            padding: "14px 16px",
            background: "rgba(255,255,255,0.76)",
          }}
        />
      </label>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontSize: "0.9rem", color: "var(--muted)", fontWeight: 600 }}>标签</span>
        <input
          value={filters.tag}
          onChange={updateField("tag")}
          placeholder="按标签筛选"
          style={{
            borderRadius: 16,
            border: "1px solid var(--border)",
            padding: "14px 16px",
            background: "rgba(255,255,255,0.76)",
          }}
        />
      </label>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontSize: "0.9rem", color: "var(--muted)", fontWeight: 600 }}>状态</span>
        <select
          value={filters.status}
          onChange={updateField("status")}
          style={{
            borderRadius: 16,
            border: "1px solid var(--border)",
            padding: "14px 16px",
            background: "rgba(255,255,255,0.76)",
          }}
        >
          <option value="all">全部状态</option>
          <option value="todo">待开始</option>
          <option value="in_progress">进行中</option>
          <option value="done">已完成</option>
        </select>
      </label>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontSize: "0.9rem", color: "var(--muted)", fontWeight: 600 }}>优先级</span>
        <select
          value={filters.priority}
          onChange={updateField("priority")}
          style={{
            borderRadius: 16,
            border: "1px solid var(--border)",
            padding: "14px 16px",
            background: "rgba(255,255,255,0.76)",
          }}
        >
          <option value="all">全部优先级</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
      </label>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontSize: "0.9rem", color: "var(--muted)", fontWeight: 600 }}>排序</span>
        <select
          value={filters.sort}
          onChange={updateField("sort")}
          style={{
            borderRadius: 16,
            border: "1px solid var(--border)",
            padding: "14px 16px",
            background: "rgba(255,255,255,0.76)",
          }}
        >
          <option value="created_desc">按创建时间</option>
          <option value="updated_desc">按最近更新</option>
          <option value="due_asc">按截止时间</option>
          <option value="priority_desc">按优先级</option>
        </select>
      </label>
    </section>
  );
}
