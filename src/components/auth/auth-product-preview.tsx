"use client";

import { useMemo, useState } from "react";

import { useAuthPreviewState } from "@/components/auth/auth-preview-state";
import type { AuthAccountLookupStatus } from "@/components/auth/auth-preview-state";
import type { TaskPreviewSummary } from "@/features/tasks/utils/task-summary";
import { getEmptyTaskPreviewSummary, getTaskPreviewSummary } from "@/features/tasks/utils/task-summary";
import { useAuth } from "@/providers/auth-provider";
import { useTaskStore } from "@/store/task-store";

type PreviewTab = "workspace" | "tasks" | "calendar" | "analytics";

const previewTabs: Array<{ value: PreviewTab; label: string }> = [
  { value: "workspace", label: "今日总览" },
  { value: "tasks", label: "任务" },
  { value: "calendar", label: "日期安排" },
  { value: "analytics", label: "简单统计" },
];

export function AuthProductPreview() {
  const [activeTab, setActiveTab] = useState<PreviewTab>("workspace");
  const { user, profile, isConfigured } = useAuth();
  const { preloginAccountStatus, preloginEmail, preloginName } = useAuthPreviewState();
  const tasks = useTaskStore((state) => state.tasks);
  const canPreviewUserData = Boolean(user && (!isConfigured || user.emailVerified));
  const normalizedPreloginName = preloginName.trim();
  const normalizedPreloginEmail = preloginEmail.trim();
  const hasPreloginIdentity = (normalizedPreloginName.length > 0 || normalizedPreloginEmail.length > 0) && !canPreviewUserData;
  const isPreparingAccount = normalizedPreloginName.length > 0 && !canPreviewUserData;
  const preloginSubject = normalizedPreloginName || normalizedPreloginEmail;
  const summary = useMemo(
    () => (canPreviewUserData ? getTaskPreviewSummary(tasks) : getEmptyTaskPreviewSummary()),
    [canPreviewUserData, tasks],
  );
  const displayName = canPreviewUserData
    ? profile?.fullName || user?.name || user?.email || "已登录用户"
    : preloginSubject || "未登录";
  const previewHint = getWorkspaceHint({
    accountStatus: preloginAccountStatus,
    canPreviewUserData,
    hasPreloginIdentity,
    preloginSubject,
  });
  const profileStatus = canPreviewUserData
    ? "预览中"
    : preloginAccountStatus === "checking"
      ? "确认中"
      : preloginAccountStatus === "registered"
        ? "待登录"
        : isPreparingAccount
          ? "准备创建"
          : hasPreloginIdentity
            ? "准备同步"
            : "等待登录";

  return (
    <div className="auth-product-preview">
      <div className="auth-preview-sidebar">
        <div className="auth-preview-logo">
          <span className="auth-preview-logo-mark">✓</span>
          <span>U&apos;s Task</span>
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
            <small>{profileStatus}</small>
          </div>
        </div>
      </div>
      <div className="auth-preview-main">
        <p className="auth-preview-heading">{previewTabs.find((tab) => tab.value === activeTab)?.label}</p>
        {activeTab === "workspace" ? <WorkspacePreview summary={summary} hint={previewHint} /> : null}
        {activeTab === "tasks" ? (
          <TasksPreview
            summary={summary}
            accountStatus={preloginAccountStatus}
            canPreviewUserData={canPreviewUserData}
            hasPreloginIdentity={hasPreloginIdentity}
          />
        ) : null}
        {activeTab === "calendar" ? (
          <CalendarPreview
            summary={summary}
            accountStatus={preloginAccountStatus}
            canPreviewUserData={canPreviewUserData}
            hasPreloginIdentity={hasPreloginIdentity}
          />
        ) : null}
        {activeTab === "analytics" ? (
          <AnalyticsPreview
            summary={summary}
            accountStatus={preloginAccountStatus}
            canPreviewUserData={canPreviewUserData}
            hasPreloginIdentity={hasPreloginIdentity}
          />
        ) : null}
      </div>
    </div>
  );
}

function getWorkspaceHint({
  accountStatus,
  canPreviewUserData,
  hasPreloginIdentity,
  preloginSubject,
}: {
  accountStatus: AuthAccountLookupStatus;
  canPreviewUserData: boolean;
  hasPreloginIdentity: boolean;
  preloginSubject: string;
}) {
  if (canPreviewUserData) {
    return "这些数据会跟任务本一起更新。";
  }

  if (accountStatus === "checking") {
    return "正在确认这个邮箱的账号状态，真实进度先不展示。";
  }

  if (accountStatus === "registered") {
    return `${preloginSubject} 看起来已经有记录。登录后再展示真实进度。`;
  }

  if (accountStatus === "available") {
    return `${preloginSubject} 还没有记录。注册后就从 0 开始整理。`;
  }

  if (hasPreloginIdentity) {
    return `准备为 ${preloginSubject} 接上任务数据。登录成功后再展示真实进度。`;
  }

  return "输入邮箱并登录后，就能看到你的当前进度。";
}

function getLockedPreviewMessage({
  accountStatus,
  available,
  fallback,
  registered,
}: {
  accountStatus: AuthAccountLookupStatus;
  available: string;
  fallback: string;
  registered: string;
}) {
  if (accountStatus === "checking") {
    return "正在确认账号状态，稍等一下就好。";
  }

  if (accountStatus === "registered") {
    return registered;
  }

  if (accountStatus === "available") {
    return available;
  }

  return fallback;
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
      <PreviewTaskList tasks={previewTasks} emptyText="登录后，今天要做什么会排在这里。" />
    </>
  );
}

function TasksPreview({
  summary,
  accountStatus,
  canPreviewUserData,
  hasPreloginIdentity,
}: {
  summary: TaskPreviewSummary;
  accountStatus: AuthAccountLookupStatus;
  canPreviewUserData: boolean;
  hasPreloginIdentity: boolean;
}) {
  const fallback = hasPreloginIdentity
    ? "身份先记上了。登录成功后，待办清单会出现在这里。"
    : "先输入邮箱并登录，待办清单会在这里显示。";

  return (
    <PreviewTaskList
      tasks={summary.focusTasks}
      emptyText={
        canPreviewUserData
          ? "现在没有待推进任务，挺清爽。"
          : getLockedPreviewMessage({
              accountStatus,
              available: "这个邮箱还没有记录。注册后，第一批待办就在这里排队。",
              fallback,
              registered: "这个邮箱已有记录。登录后，待办清单会正式显示。",
            })
      }
    />
  );
}

function CalendarPreview({
  summary,
  accountStatus,
  canPreviewUserData,
  hasPreloginIdentity,
}: {
  summary: TaskPreviewSummary;
  accountStatus: AuthAccountLookupStatus;
  canPreviewUserData: boolean;
  hasPreloginIdentity: boolean;
}) {
  const fallback = hasPreloginIdentity
    ? "账号信息已就位。登录后，日期安排会按顺序排好。"
    : "登录后再按日期排好，不让事情挤成一团。";

  return (
    <div className="auth-preview-list">
      {summary.calendarGroups.map((group) => (
        <div key={group.label}>
          <strong>{group.label}</strong>
          <span>{group.tasks.length ? `${group.tasks.length} 条` : "暂无"}</span>
        </div>
      ))}
      {!canPreviewUserData ? (
        <p className="auth-preview-empty">
          {getLockedPreviewMessage({
            accountStatus,
            available: "这个邮箱还没有日期记录。注册后，日期格子会从空白开始填满。",
            fallback,
            registered: "这个邮箱已有日期记录。登录后再展示。",
          })}
        </p>
      ) : null}
    </div>
  );
}

function AnalyticsPreview({
  summary,
  accountStatus,
  canPreviewUserData,
  hasPreloginIdentity,
}: {
  summary: TaskPreviewSummary;
  accountStatus: AuthAccountLookupStatus;
  canPreviewUserData: boolean;
  hasPreloginIdentity: boolean;
}) {
  const fallback = hasPreloginIdentity
    ? "先不展示真实数据。登录后，完成率和优先级会算给你看。"
    : "登录后再看统计，数字会更准确。";

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
      {!canPreviewUserData ? (
        <p className="auth-preview-empty">
          {getLockedPreviewMessage({
            accountStatus,
            available: "这个邮箱还没有统计记录。注册后，完成率会从 0 开始累积。",
            fallback,
            registered: "这个邮箱已有统计数据。登录后再看。",
          })}
        </p>
      ) : null}
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
