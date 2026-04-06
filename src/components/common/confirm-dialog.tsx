"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";

type ConfirmDialogProps = {
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  triggerStyle?: CSSProperties;
  confirmTone?: "default" | "danger";
};

export function ConfirmDialog({
  triggerLabel,
  title,
  description,
  confirmLabel = "确认",
  onConfirm,
  triggerStyle,
  confirmTone = "default",
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onConfirm();
      setOpen(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "操作失败，请稍后再试。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={triggerStyle}>
        {triggerLabel}
      </button>
      {open ? (
        <Overlay>
          <section
            className="card-surface"
            style={{
              width: "min(520px, 100%)",
              borderRadius: 28,
              padding: 24,
            }}
          >
            <p
              style={{
                margin: 0,
                color: confirmTone === "danger" ? "var(--danger)" : "var(--primary)",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              请确认操作
            </p>
            <h2 style={{ margin: "10px 0 0", fontSize: "1.5rem" }}>{title}</h2>
            <p style={{ margin: "12px 0 0", color: "var(--muted)", lineHeight: 1.7 }}>{description}</p>
            {submitError ? <p style={{ margin: "12px 0 0", color: "var(--danger)", lineHeight: 1.7 }}>{submitError}</p> : null}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button type="button" onClick={() => setOpen(false)} style={secondaryButtonStyle}>
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                style={{
                  ...primaryButtonStyle,
                  background: confirmTone === "danger" ? "var(--danger)" : "var(--primary)",
                  opacity: isSubmitting ? 0.8 : 1,
                }}
              >
                {isSubmitting ? "处理中..." : confirmLabel}
              </button>
            </div>
          </section>
        </Overlay>
      ) : null}
    </>
  );
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        padding: 20,
        background: "rgba(16, 24, 40, 0.38)",
        display: "grid",
        placeItems: "center",
      }}
    >
      {children}
    </div>
  );
}

const secondaryButtonStyle = {
  border: "1px solid var(--border)",
  background: "transparent",
  padding: "12px 16px",
  borderRadius: 999,
  fontWeight: 700,
} satisfies CSSProperties;

const primaryButtonStyle = {
  border: 0,
  padding: "12px 16px",
  borderRadius: 999,
  color: "var(--primary-foreground)",
  fontWeight: 700,
} satisfies CSSProperties;
