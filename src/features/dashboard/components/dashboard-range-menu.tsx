"use client";

import Link from "next/link";

import type { DashboardAnalyticsRange } from "@/features/tasks/utils/task-analytics";

export type DashboardRangeOption = { value: DashboardAnalyticsRange; label: string };

type DashboardRangeMenuProps = {
  range: DashboardAnalyticsRange;
  options: DashboardRangeOption[];
  onChange: (range: DashboardAnalyticsRange) => void;
};

export function DashboardRangeMenu({ range, options, onChange }: DashboardRangeMenuProps) {
  return (
    <div className="dashboard-range-menu" aria-label="总览任务范围工具栏">
      <label className="sr-only" htmlFor="dashboard-range-select">任务范围</label>
      <div className="dashboard-range-menu__select-wrap">
        <select
          id="dashboard-range-select"
          value={range}
          onChange={(event) => onChange(event.target.value as DashboardAnalyticsRange)}
          className="dashboard-range-menu__select"
        >
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <span className="dashboard-range-menu__chevron" aria-hidden="true" />
      </div>
      <Link href="/tasks" className="dashboard-range-menu__tool dashboard-range-menu__tool--filter" aria-label="打开任务筛选" title="打开任务筛选"><span aria-hidden="true" /></Link>
      <details className="dashboard-range-menu__more">
        <summary aria-label="更多总览操作" title="更多操作"><span aria-hidden="true" /></summary>
        <div className="dashboard-range-menu__more-menu"><Link href="/tasks">查看任务列表</Link></div>
      </details>
    </div>
  );
}
