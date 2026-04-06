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
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr",
        gap: 24,
        padding: 24,
      }}
    >
      <section
        className="card-surface"
        style={{
          borderRadius: 32,
          padding: 40,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(circle at top left, rgba(199,91,57,0.2), transparent 30%), rgba(255,255,255,0.78)",
        }}
      >
        <div>
          <p style={{ margin: 0, color: "var(--primary)", fontWeight: 800, letterSpacing: "0.08em" }}>
            清衡任务台
          </p>
          <h1 style={{ margin: "18px 0 0", fontSize: "clamp(2.4rem, 4vw, 4rem)", lineHeight: 1.02 }}>
            一个更安静的
            <br />
            中文任务空间。
          </h1>
        </div>
        <p style={{ margin: 0, maxWidth: 520, color: "var(--muted)", lineHeight: 1.8 }}>
          把优先级放在眼前，把噪音留在外面，让你在中文环境下也能自然地阅读、规划与推进工作。
        </p>
      </section>
      <section
        className="card-surface"
        style={{
          borderRadius: 32,
          padding: 32,
          display: "grid",
          alignItems: "center",
        }}
      >
        {children}
      </section>
    </main>
  );
}
