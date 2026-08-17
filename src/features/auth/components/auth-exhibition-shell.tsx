"use client";

import type { ReactNode } from "react";

import { AuthPageBackground } from "@/features/auth/components/auth-page-background";
import { AuthEntryLoader } from "@/features/auth/components/auth-entry-loader";

import { AuthPreviewStateProvider, useAuthPreviewState } from "@/features/auth/components/auth-preview-state";
import { getAuthPreviewWeek } from "@/features/auth/utils/auth-preview-week";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTaskStore } from "@/features/tasks/store/task-store";
import { getEmptyTaskPreviewSummary, getTaskPreviewSummary } from "@/features/tasks/utils/task-summary";

type AuthExhibitionShellProps = { children: ReactNode };

export function AuthExhibitionShell({ children }: AuthExhibitionShellProps) {
  return (
    <main className="auth-page">
      <AuthPageBackground />
      <AuthEntryLoader />
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
  const previewWeek = getAuthPreviewWeek(isReady ? tasks : []);
  const displayName = profile?.fullName || user?.name || preloginEmail || "你的工作台";

  return (
    <section className="auth-frame" data-auth-entry-target>
      <aside className="auth-brand-panel">
        <div className="auth-brand-copy">
          <div className="auth-brand-row">
            <span className="auth-brand-mark" aria-hidden="true">
              ✓
            </span>
            <span className="auth-brand-name">U&apos;s Task</span>
          </div>
          <h1 className="auth-brand-title">个人任务工作台</h1>
          <p className="auth-brand-description">集中查看待办、截止时间和完成进度。</p>
        </div>

        <div className="auth-preview-stack">
          <div className="auth-product-surface" aria-label="任务工作台预览">
            <div className="auth-preview-main">
              <header className="auth-preview-main__header">
                <div>
                  <p>预览工作台</p>
                  <strong>{isReady ? displayName + "的任务概览" : "个人任务概览"}</strong>
                </div>
                <span
                  className={
                    isReady ? "auth-preview-connection auth-preview-connection--ready" : "auth-preview-connection"
                  }
                >
                  {isReady ? "已连接" : previewPhase === "hydrating" ? "同步中" : "未连接"}
                </span>
              </header>
              <div className="auth-preview-status-grid">
                <div>
                  <span>待处理</span>
                  <strong>{isReady ? summary.todoCount + summary.inProgressCount : "--"}</strong>
                </div>
                <div>
                  <span>今日到期</span>
                  <strong>{isReady ? summary.dueTodayCount : "--"}</strong>
                </div>
                <div>
                  <span>本周计划</span>
                  <strong>{isReady ? summary.upcomingCount : "--"}</strong>
                </div>
                <div>
                  <span>已完成</span>
                  <strong>{isReady ? summary.doneCount : "--"}</strong>
                </div>
              </div>
              <p
                className={
                  isReady ? "auth-preview-sync-notice auth-preview-sync-notice--ready" : "auth-preview-sync-notice"
                }
              >
                <span aria-hidden="true" />
                {isReady ? "个人任务统计已同步完成" : "登录后自动同步你的个人任务数据"}
              </p>
              <div className="auth-preview-account">
                <span className="auth-preview-account__avatar" aria-hidden={!isReady}>
                  {isReady && profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={`${displayName}的头像`} />
                  ) : isReady ? (
                    displayName.slice(0, 1).toUpperCase()
                  ) : null}
                </span>
                <div>
                  <strong>{isReady ? displayName : "暂未登录"}</strong>
                  <small>{isReady ? "个人工作台已连接" : "登录后展示你的昵称和头像"}</small>
                </div>
              </div>
            </div>
          </div>
          <section className="auth-preview-week" aria-label="本周截止安排">
            <header className="auth-preview-week__header">
              <strong>本周截止安排</strong>
              <span>
                {previewWeek[0].dateLabel} - {previewWeek[6].dateLabel}
              </span>
            </header>
            <div className="auth-preview-week__grid">
              {previewWeek.map((day) => (
                <div
                  className={
                    "auth-preview-week__day" +
                    (day.isToday ? " auth-preview-week__day--today" : "") +
                    (day.hasOverdue ? " auth-preview-week__day--overdue" : "")
                  }
                  key={day.key}
                  aria-label={
                    isReady ? `${day.key}，${day.taskCount} 项截止任务` : `${day.key}，登录后显示截止任务数量`
                  }
                >
                  <span>{`周${day.weekday}`}</span>
                  <strong>{day.dateLabel}</strong>
                  <small>{isReady ? day.taskCount : "--"}</small>
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>
      <section className="auth-form-panel">{children}</section>
    </section>
  );
}
