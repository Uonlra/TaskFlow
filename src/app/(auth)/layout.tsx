import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AuthProductPreview } from "@/components/auth/auth-product-preview";
import { AuthPreviewStateProvider } from "@/components/auth/auth-preview-state";
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
      <AuthPreviewStateProvider>
        <section className="auth-frame">
          <aside className="auth-brand-panel">
            <div className="auth-brand-copy">
              <div className="auth-brand-row">
                <span className="auth-brand-mark" aria-hidden="true">
                  ✓
                </span>
                <span className="section-eyebrow auth-brand-name">U&apos;s Task</span>
              </div>
              <h1 className="auth-brand-title">
                把事情放好，
                <span>再慢慢推进</span>
              </h1>
              <p className="auth-brand-description">
                这是我给自己做的任务小应用，记录、筛选和回看都尽量清楚一点。
              </p>
            </div>

            <AuthProductPreview />
          </aside>

          <section className="auth-form-panel">{children}</section>
        </section>
      </AuthPreviewStateProvider>
    </main>
  );
}
