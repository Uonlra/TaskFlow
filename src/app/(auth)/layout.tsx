import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { hasAppwriteEnv } from "@/lib/appwrite/env";
import { getCurrentAuthEnvelope } from "@/lib/appwrite/server";

type AuthLayoutProps = {
  children: ReactNode;
};

export default async function AuthLayout({ children }: AuthLayoutProps) {
  if (hasAppwriteEnv) {
    const auth = await getCurrentAuthEnvelope();

    if (auth?.user?.emailVerified) {
      redirect("/dashboard");
    }
  }

  return (
    <main className="auth-shell">
      <section className="card-surface auth-product-panel">
        <div className="auth-shell__panel">
          <div className="auth-product-copy">
            <p className="section-eyebrow auth-product-kicker">U's TaskFlow</p>
            <h1>
              把今天、截止日
              <br />
              和长期目标
              <br />
              放回清晰工作台。
            </h1>
            <p>
              登录后继续推进你的任务节奏。左侧预览保留真实产品语言，让进入工作台之前也能看见下一步。
            </p>
          </div>

          <div className="auth-preview" aria-label="TaskFlow dashboard preview">
            <div className="auth-preview__topbar">
              <div>
                <span className="auth-preview__dot" />
                <span className="auth-preview__dot auth-preview__dot--cyan" />
                <span className="auth-preview__dot auth-preview__dot--indigo" />
              </div>
              <span className="ui-sans">今日工作台</span>
            </div>

            <div className="auth-preview__hero">
              <div>
                <p className="section-eyebrow">Focus</p>
                <strong>6 个任务正在推进</strong>
                <span>2 个将在今天到期</span>
              </div>
              <div className="auth-preview__ring">
                <span>72%</span>
              </div>
            </div>

            <div className="auth-preview__stats">
              <div>
                <span className="metric-value">12</span>
                <p>本周完成</p>
              </div>
              <div>
                <span className="metric-value">4</span>
                <p>高优先级</p>
              </div>
              <div>
                <span className="metric-value">3</span>
                <p>标签分组</p>
              </div>
            </div>

            <div className="auth-preview__tasks">
              {[
                ["完善登录页视觉", "今天 18:00", "high"],
                ["整理 Appwrite 数据链路", "明天", "normal"],
                ["复盘 Dashboard 图表", "周五", "calm"],
              ].map(([title, time, tone]) => (
                <div className="auth-preview__task" key={title}>
                  <span className={`auth-preview__task-dot auth-preview__task-dot--${tone}`} />
                  <div>
                    <strong>{title}</strong>
                    <p>{time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="card-surface auth-shell__form">
        <div className="auth-form-card">{children}</div>
      </section>
    </main>
  );
}
