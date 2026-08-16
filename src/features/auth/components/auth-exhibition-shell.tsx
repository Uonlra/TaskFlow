"use client";

import type { ReactNode } from "react";

import { AuthPageBackground } from "@/features/auth/components/auth-page-background";

import { AuthPreviewStateProvider, useAuthPreviewState } from "@/features/auth/components/auth-preview-state";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTaskStore } from "@/features/tasks/store/task-store";
import { getEmptyTaskPreviewSummary, getTaskPreviewSummary } from "@/features/tasks/utils/task-summary";

type AuthExhibitionShellProps = { children: ReactNode };

const previewNavigation = [
  { label: "总览", kind: "overview", active: true },
  { label: "任务", kind: "tasks", active: false },
  { label: "日历", kind: "calendar", active: false },
  { label: "统计", kind: "stats", active: false },
];

export function AuthExhibitionShell({ children }: AuthExhibitionShellProps) {
  return (
    <main className="auth-page">
      <AuthPageBackground />
      <AuthPreviewStateProvider>
        <AuthPreviewLayout>{children}</AuthPreviewLayout>
      </AuthPreviewStateProvider>
    </main>
  );
}

function AuthPreviewLayout({ children }: { children: ReactNode }) {
  const { profile, user } = useAuth();
  const { previewPhase, preloginEmail } = useAuthPreviewState();
  const tasks = useTaskStore((state) => state.tasks);
  const isReady = previewPhase === "ready";
  const summary = isReady ? getTaskPreviewSummary(tasks) : getEmptyTaskPreviewSummary();
  const displayName = profile?.fullName || user?.name || preloginEmail || "你的工作台";
  const previewMessage =
    previewPhase === "hydrating" ? "正在同步你的任务" : isReady ? "任务数据已连接" : "登录后同步你的工作台";

  return (
    <section className="auth-frame">
      <aside className="auth-brand-panel">
        <div className="auth-brand-copy">
          <div className="auth-brand-row">
            <span className="auth-brand-mark" aria-hidden="true">
              ✓
            </span>
            <span className="auth-brand-name">U&apos;s Task</span>
          </div>
          <h1 className="auth-brand-title">
            把手头的事，
            <span>放回清楚的节奏里</span>
          </h1>
          <p className="auth-brand-description">从今天要做什么，到下一项该推进什么，都在同一个任务工作台里保持清楚。</p>
        </div>

        <div
          className={isReady ? "auth-product-surface auth-product-surface--ready" : "auth-product-surface"}
          aria-label="任务工作台预览"
        >
          <nav className="auth-preview-nav" aria-label="工作台功能">
            <p className="auth-preview-nav__label">工作台</p>
            <ul>
              {previewNavigation.map((item) => (
                <li
                  key={item.kind}
                  className={
                    item.active ? "auth-preview-nav__item auth-preview-nav__item--active" : "auth-preview-nav__item"
                  }
                >
                  <span className={"auth-preview-nav__mark auth-preview-nav__mark--" + item.kind} aria-hidden="true" />
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
            <div className="auth-preview-nav__profile">
              <span aria-hidden="true" />
              <div>
                <strong>{isReady ? displayName : "等待登录"}</strong>
                <small>{previewMessage}</small>
              </div>
            </div>
          </nav>

          <div className="auth-preview-main">
            <header className="auth-preview-main__header">
              <div>
                <p>总览</p>
                <strong>{isReady ? displayName + "的工作台" : "今天的工作台"}</strong>
              </div>
              <span
                className={
                  isReady ? "auth-preview-connection auth-preview-connection--ready" : "auth-preview-connection"
                }
              >
                {isReady ? "已连接" : previewPhase === "hydrating" ? "同步中" : "未连接"}
              </span>
            </header>
            <section className="auth-preview-focus">
              <p>{isReady ? "同步完成" : "当前焦点"}</p>
              <h2>{isReady ? "你的任务已经准备好了" : "登录后继续整理你的任务"}</h2>
              <span>
                {isReady ? "现在可以查看任务状态、截止提醒和进度记录。" : "任务状态、截止提醒和进度记录会在此处同步。"}
              </span>
            </section>
            <div className="auth-preview-status-grid">
              <div>
                <span>全部任务</span>
                <strong>{isReady ? summary.totalCount : "等待同步"}</strong>
              </div>
              <div>
                <span>待处理</span>
                <strong>{isReady ? summary.todoCount + summary.inProgressCount : "等待同步"}</strong>
              </div>
              <div>
                <span>已完成</span>
                <strong>{isReady ? summary.doneCount : "等待同步"}</strong>
              </div>
              <div>
                <span>逾期提醒</span>
                <strong>{isReady ? summary.overdueCount : "等待同步"}</strong>
              </div>
            </div>
            <section className="auth-preview-activity">
              <div className="auth-preview-activity__heading">
                <span>{isReady ? "优先查看" : "最近动态"}</span>
                <small>{isReady ? "当前任务" : "登录后显示"}</small>
              </div>
              {isReady && summary.focusTasks.length > 0 ? (
                summary.focusTasks.slice(0, 2).map((task) => (
                  <div className="auth-preview-activity__row" key={task.id}>
                    <i aria-hidden="true" />
                    <span>{task.title}</span>
                    <small>{task.dueLabel}</small>
                  </div>
                ))
              ) : (
                <div className="auth-preview-activity__row">
                  <i aria-hidden="true" />
                  <span>{isReady ? "还没有待处理任务" : "你的任务记录会出现在这里"}</span>
                </div>
              )}
            </section>
          </div>
        </div>
      </aside>
      <section className="auth-form-panel">{children}</section>
    </section>
  );
}
