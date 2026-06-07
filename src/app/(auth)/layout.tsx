import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AuthProductPreview } from "@/components/auth/auth-product-preview";
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

          <AuthProductPreview />
        </aside>

        <section className="auth-form-panel">{children}</section>
      </section>
    </main>
  );
}
