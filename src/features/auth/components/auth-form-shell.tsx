import type { ReactNode } from "react";

type AuthFormShellProps = {
  title: string;
  description: string;
  footer: ReactNode;
  children: ReactNode;
};

export function AuthFormShell({ title, description, footer, children }: AuthFormShellProps) {
  return (
    <div className="auth-form-shell">
      <header>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      {children}
      <footer>{footer}</footer>
    </div>
  );
}
