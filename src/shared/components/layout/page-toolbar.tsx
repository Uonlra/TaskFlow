import type { ReactNode } from "react";

type PageToolbarProps = {
  accessibleTitle: string;
  context?: ReactNode;
  controls?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  className?: string;
};

export function PageToolbar({
  accessibleTitle,
  context,
  controls,
  primaryAction,
  secondaryActions,
  className = "",
}: PageToolbarProps) {
  const toolbarClassName = ["page-toolbar", className].filter(Boolean).join(" ");

  return (
    <header className={toolbarClassName} aria-label={accessibleTitle}>
      <h1 className="visually-hidden">{accessibleTitle}</h1>
      <div className="page-toolbar__row">
        {context ? <div className="page-toolbar__context">{context}</div> : null}
        {controls ? <div className="page-toolbar__controls">{controls}</div> : null}
        {secondaryActions ? <div className="page-toolbar__secondary">{secondaryActions}</div> : null}
        {primaryAction ? <div className="page-toolbar__primary">{primaryAction}</div> : null}
      </div>
    </header>
  );
}
