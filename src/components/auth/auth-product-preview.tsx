"use client";

import { useMemo, useState } from "react";

import type { TaskPreviewSummary } from "@/features/tasks/utils/task-summary";
import { getEmptyTaskPreviewSummary, getTaskPreviewSummary } from "@/features/tasks/utils/task-summary";
import { useAuth } from "@/providers/auth-provider";
import { useTaskStore } from "@/store/task-store";

type PreviewTab = "workspace" | "tasks" | "calendar" | "analytics";

const previewTabs: Array<{ value: PreviewTab; label: string }> = [
  { value: "workspace", label: "今日工作台" },
  { value: "tasks", label: "任务" },
  { value: "calendar", label: "日历视图" },
  { value: "analytics", label: "统计分析" },
];

export function AuthProductPreview() {
  const [activeTab, setActiveTab] = useState<PreviewTab>("workspace");
  const { user, profile, isConfigured } = useAuth();
  const tasks = useTaskStore((state) => state.tasks);
  const canPreviewUserData = Boolean(user && (!isConfigured || user.emailVerified));
  const summary = useMemo(
    () => (canPreviewUserData ? getTaskPreviewSummary(tasks) : getEmptyTaskPreviewSummary()),
    [canPreviewUserData, tasks],
  );
  const displayName = profile?.fullName || user?.name || user?.email || "未登录";
  const previewHint = canPreviewUserData
    ? "这些数据会跟工作台一起更新。"
    : "登录后就能预览你的当前进度。";

  return (
    <div className="auth-product-preview">
      <div className="auth-preview-sidebar">
        <div className="auth-preview-logo">
          <span className="auth-preview-logo-mark">✓</span>
          <span>TaskFlow</span>
        </div>
        <div className="auth-preview-nav-list" role="tablist" aria-label="预览视图">
          {previewTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.value}
              className={activeTab === tab.value ? "auth-preview-nav auth-preview-nav--active" : "auth-preview-nav"}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="auth-preview-profile">
          <span />
          <div>
            <strong>{displayName}</strong>
            <small>{canPreviewUserData ? "预览中" : "等待登录"}</small>
          </div>
        </div>
      </div>
      <div className="auth-preview-main">
        <p className="auth-preview-heading">{previewTabs.find((tab) => tab.value === activeTab)?.label}</p>
        {activeTab === "workspace" ? <WorkspacePreview summary={summary} hint={previewHint} /> : null}
        {activeTab === "tasks" ? <TasksPreview summary={summary} canPreviewUserData={canPreviewUserData} /> : null}
        {activeTab === "calendar" ? <CalendarPreview summary={summary} canPreviewUserData={canPreviewUserData} /> : null}
        {activeTab === "analytics" ? <AnalyticsPreview summary={summary} /> : null}
      </div>
    </div>
  );
}

function WorkspacePreview({ summary, hint }: { summary: TaskPreviewSummary; hint: string }) {
  const previewTasks = summary.focusTasks.length ? summary.focusTasks : summary.recentTasks;

  return (
    <>
      <div className="auth-preview-grid">
        <div className="auth-preview-focus">
          <span>今日专注</span>
          <strong>{summary.completionRate}%</strong>
          <small>{hint}</small>
        </div>
        <div className="auth-preview-summary">
          <strong>任务概览</strong>
          <span>全部任务 {summary.totalCount}</span>
          <span>进行中 {summary.inProgressCount}</span>
          <span>已完成 {summary.doneCount}</span>
        </div>
      </div>
      <PreviewTaskList tasks={previewTasks} emptyText="登录后，你的任务会出现在这里。" />
    </>
  );
}

function TasksPreview({ summary, canPreviewUserData }: { summary: TaskPreviewSummary; canPreviewUserData: boolean }) {
  return (
    <PreviewTaskList
      tasks={summary.focusTasks}
      emptyText={canPreviewUserData ? "现在没有待推进任务，挺清爽。" : "登录后可以看到你的待办列表。"}
    />
  );
}

function CalendarPreview({ summary, canPreviewUserData }: { summary: TaskPreviewSummary; canPreviewUserData: boolean }) {
  return (
    <div className="auth-preview-list">
      {summary.calendarGroups.map((group) => (
        <div key={group.label}>
          <strong>{group.label}</strong>
          <span>{group.tasks.length ? `${group.tasks.length} 条` : "暂无"}</span>
        </div>
      ))}
      {!canPreviewUserData ? <p className="auth-preview-empty">登录后再按日期帮你排好。</p> : null}
    </div>
  );
}

function AnalyticsPreview({ summary }: { summary: TaskPreviewSummary }) {
  return (
    <div className="auth-preview-list">
      <div>
        <strong>高优先级</strong>
        <span>{summary.priorityCounts.high} 条</span>
      </div>
      <div>
        <strong>今天到期</strong>
        <span>{summary.dueTodayCount} 条</span>
      </div>
      <div>
        <strong>已逾期</strong>
        <span>{summary.overdueCount} 条</span>
      </div>
    </div>
  );
}

function PreviewTaskList({
  tasks,
  emptyText,
}: {
  tasks: TaskPreviewSummary["focusTasks"];
  emptyText: string;
}) {
  if (!tasks.length) {
    return <p className="auth-preview-empty">{emptyText}</p>;
  }

  return (
    <div className="auth-preview-list">
      {tasks.map((task) => (
        <div key={task.id}>
          <strong>{task.title}</strong>
          <span>{task.dueLabel}</span>
        </div>
      ))}
    </div>
  );
}
