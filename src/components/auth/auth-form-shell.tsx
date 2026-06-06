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
    <section className="auth-form-shell">
      <header className="auth-form-header">
        <p className="section-eyebrow auth-form-eyebrow">{eyebrow}</p>
        <h1 className="auth-form-title">{title}</h1>
        <p className="auth-form-description">{description}</p>
      </header>
      <div className="auth-form-body">{children}</div>
      <div className="auth-form-footer">{footer}</div>
    </section>
  );
}
