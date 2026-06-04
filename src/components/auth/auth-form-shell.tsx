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
      <p className="section-eyebrow auth-form-shell__eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="auth-form-shell__description">{description}</p>
      <div className="auth-form-shell__body">{children}</div>
      <div className="auth-form-shell__footer">{footer}</div>
    </section>
  );
}
