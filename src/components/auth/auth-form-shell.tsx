import type { ReactNode } from "react";

type AuthFormShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  footer: ReactNode;
  children: ReactNode;
};

export function AuthFormShell({ eyebrow, title, description, footer, children }: AuthFormShellProps) {
  return (
    <section>
      <p className="section-eyebrow" style={{ margin: 0, color: "var(--primary)", fontWeight: 700, fontSize: "0.84rem" }}>
        {eyebrow}
      </p>
      <h1 style={{ margin: "16px 0 0", fontSize: "2.15rem", lineHeight: 1.25 }}>{title}</h1>
      <p style={{ margin: "14px 0 0", color: "var(--muted-strong)", lineHeight: 1.85 }}>{description}</p>
      <div style={{ marginTop: 28 }}>{children}</div>
      <div style={{ marginTop: 20, color: "var(--muted-strong)", lineHeight: 1.8 }}>{footer}</div>
    </section>
  );
}
