import type { ReactNode } from "react";
import { BookOpen, Check, Circle, CircleDashed, CalendarDays } from "lucide-react";

import { BrandMark } from "@/shared/components/layout/brand-mark";

const agenda = [
  { time: "09:00", title: "整理本周阅读笔记", detail: "学习", icon: Check, state: "done", status: "已完成" },
  { time: "11:30", title: "完成项目设计稿", detail: "工作", icon: CircleDashed, state: "active", status: "进行中" },
  { time: "16:00", title: "为周末留点时间", detail: "生活", icon: Circle, state: "pending", status: "待处理" },
];

export function AuthExhibitionShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth-page">
      <div className="auth-frame">
        <div className="auth-brand">
          <BrandMark />
          U&apos;s Task
        </div>
        <aside className="auth-showcase" aria-label="工作台示例">
          <div className="auth-intro">
            <h2>个人任务工作台</h2>
            <p>把待办、日程和进度放在同一页。</p>
          </div>
          <section className="auth-notebook" aria-label="今日计划示例">
            <header className="auth-notebook-header">
              <BookOpen size={18} aria-hidden="true" />
              <span>今日计划</span>
              <small>示例</small>
            </header>
            <ul className="auth-agenda">
              {agenda.map(({ time, title, detail, icon: Icon, state, status }) => (
                <li key={time} data-state={state}>
                  <span className="auth-agenda-icon" aria-label={status}>
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{title}</strong>
                    <small>
                      {detail} · {status}
                    </small>
                  </div>
                  <time>{time}</time>
                </li>
              ))}
            </ul>
            <footer className="auth-notebook-footer">
              <CalendarDays size={15} aria-hidden="true" />
              今日进度<span>1 / 3 已完成</span>
            </footer>
            <progress aria-label="示例任务完成进度" value={1} max={3} />
          </section>
        </aside>
        <section className="auth-form-panel">{children}</section>
      </div>
    </main>
  );
}
