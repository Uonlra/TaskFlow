import type { ReactNode } from "react";

type DataEmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  variant?: "page" | "table" | "panel";
};

export function DataEmptyState({ title, description, action, variant = "page" }: DataEmptyStateProps) {
  return (
    <section className={`data-empty-state data-empty-state--${variant}`} aria-live="polite">
      <div className="data-empty-state__mark" aria-hidden="true" />
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action ? <div className="data-empty-state__action">{action}</div> : null}
    </section>
  );
}
