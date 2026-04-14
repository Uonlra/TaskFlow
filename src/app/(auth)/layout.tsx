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
    <main className="auth-shell">
      <section
        className="card-surface"
        style={{
          borderRadius: 32,
          padding: 40,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(237,245,255,0.88))",
        }}
      >
        <div className="auth-shell__panel">
          <div>
            <p className="section-eyebrow" style={{ margin: 0, color: "var(--primary)", fontWeight: 700, fontSize: "0.84rem" }}>
              U's Task
            </p>
            <h1 style={{ margin: "18px 0 0", fontSize: "clamp(2.4rem, 4vw, 4rem)", lineHeight: 1.04 }}>
              一个更轻、
              <br />
              更清楚的
              <br />
              中文任务空间。
            </h1>
          </div>
          <div
            className="dashboard-highlight-card"
            style={{
              padding: 22,
              borderRadius: 28,
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.84)",
            }}
          >
            <p className="section-eyebrow" style={{ margin: 0, color: "var(--data-ink)", fontWeight: 700, fontSize: "0.8rem" }}>
              Why TaskFlow
            </p>
            <p style={{ margin: "12px 0 0", color: "var(--muted-strong)", lineHeight: 1.84 }}>
              把优先级、截止时间和工作节奏整理在同一张蓝白工作台上，让你在中文环境下也能自然地规划、推进与回看。
            </p>
          </div>
        </div>
      </section>
      <section
        className="card-surface auth-shell__form"
        style={{
          borderRadius: 32,
          padding: 32,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(249,251,255,0.88))",
        }}
      >
        {children}
      </section>
    </main>
  );
}
