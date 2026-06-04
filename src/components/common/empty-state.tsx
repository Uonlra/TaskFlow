import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section
      className="card-surface"
      style={{
        borderRadius: 28,
        padding: 28,
        textAlign: "center",
        background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(247,250,255,0.84))",
      }}
    >
      <p className="section-eyebrow" style={{ margin: 0, color: "var(--data-ink)", fontWeight: 700, fontSize: "0.82rem" }}>
        Empty State
      </p>
      <h3 style={{ margin: "8px 0 0", fontSize: "1.2rem" }}>{title}</h3>
      <p style={{ margin: "12px auto 0", maxWidth: 520, color: "var(--muted-strong)", lineHeight: 1.7 }}>{description}</p>
      {action ? <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>{action}</div> : null}
    </section>
  );
}
