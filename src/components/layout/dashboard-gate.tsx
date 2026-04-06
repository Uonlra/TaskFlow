"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/providers/auth-provider";

export function DashboardGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isConfigured, isLoading, user } = useAuth();

  useEffect(() => {
    if (isConfigured && !isLoading && !user) {
      router.replace("/login");
    }
  }, [isConfigured, isLoading, router, user]);

  if (isConfigured && isLoading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <section className="card-surface" style={{ borderRadius: 28, padding: 28 }}>
          <p style={{ margin: 0, color: "var(--muted)" }}>Loading your workspace...</p>
        </section>
      </main>
    );
  }

  if (isConfigured && !user) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <section className="card-surface" style={{ borderRadius: 28, padding: 28 }}>
          <p style={{ margin: 0, color: "var(--muted)" }}>Redirecting to login...</p>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
