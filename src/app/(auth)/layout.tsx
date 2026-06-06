import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type AuthLayoutProps = {
  children: ReactNode;
};

export default async function AuthLayout({ children }: AuthLayoutProps) {
  if (hasSupabaseEnv) {
    const supabase = await getSupabaseServerClient();

    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        redirect("/dashboard");
      }
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-frame">
        <aside className="auth-brand-panel">
          <div className="auth-brand-copy">
            <div className="auth-brand-row">
              <span className="auth-brand-mark" aria-hidden="true">
                ✓
              </span>
              <span className="section-eyebrow auth-brand-name">U&apos;s TaskFlow</span>
            </div>
            <h1 className="auth-brand-title">
              专注当下，
              <span>掌控未来</span>
            </h1>
            <p className="auth-brand-description">
              清晰规划，高效执行，让每一件任务都推动你向前。
            </p>
          </div>

          <div className="auth-product-preview" aria-hidden="true">
            <div className="auth-preview-sidebar">
              <div className="auth-preview-logo">
                <span className="auth-preview-logo-mark">✓</span>
                <span>TaskFlow</span>
              </div>
              <div className="auth-preview-nav auth-preview-nav--active">今日工作台</div>
              <div className="auth-preview-nav">任务</div>
              <div className="auth-preview-nav">日历视图</div>
              <div className="auth-preview-nav">统计分析</div>
              <div className="auth-preview-profile">
                <span />
                <div>
                  <strong>uon1ra</strong>
                  <small>个人账户</small>
                </div>
              </div>
            </div>
            <div className="auth-preview-main">
              <p className="auth-preview-heading">今日工作台</p>
              <div className="auth-preview-grid">
                <div className="auth-preview-focus">
                  <span>今日专注</span>
                  <strong>72%</strong>
                  <small>进度保持，继续前进！</small>
                </div>
                <div className="auth-preview-summary">
                  <strong>任务概览</strong>
                  <span>全部任务</span>
                  <span>进行中</span>
                  <span>已完成</span>
                </div>
              </div>
              <div className="auth-preview-list">
                <div>
                  <strong>完善登录页预览</strong>
                  <span>今天 18:00</span>
                </div>
                <div>
                  <strong>整理 Supabase 数据链路</strong>
                  <span>明天</span>
                </div>
                <div>
                  <strong>复盘 Dashboard 图表</strong>
                  <span>周五</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="auth-form-panel">{children}</section>
      </section>
    </main>
  );
}
