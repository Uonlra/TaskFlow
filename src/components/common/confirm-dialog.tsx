"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

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
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    return () => {
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    if (!open || !mounted) {
      document.body.style.removeProperty("overflow");
      return;
    }

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.removeProperty("overflow");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSubmitting, mounted, open]);

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
      {open && mounted
        ? createPortal(
        <Overlay
          onDismiss={() => {
            if (!isSubmitting) {
              setOpen(false);
            }
          }}
        >
          <section
            className="card-surface"
            style={{
              width: "min(520px, 100%)",
              borderRadius: 28,
              padding: 24,
            }}
          >
            <p
              className="section-eyebrow"
              style={{
                margin: 0,
                color: confirmTone === "danger" ? "var(--danger)" : "var(--primary)",
                fontWeight: 700,
                fontSize: "0.82rem",
              }}
            >
              请确认操作
            </p>
            <h2 style={{ margin: "10px 0 0", fontSize: "1.5rem" }}>{title}</h2>
            <p style={{ margin: "12px 0 0", color: "var(--muted-strong)", lineHeight: 1.7 }}>{description}</p>
            {submitError ? <p style={{ margin: "12px 0 0", color: "var(--danger)", lineHeight: 1.7 }}>{submitError}</p> : null}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button type="button" onClick={() => setOpen(false)} style={secondaryButtonStyle}>
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="ui-sans"
                style={{
                  ...primaryButtonStyle,
                  background:
                    confirmTone === "danger"
                      ? "linear-gradient(135deg, var(--danger), #f97316)"
                      : "linear-gradient(135deg, var(--primary), var(--data-cyan))",
                  opacity: isSubmitting ? 0.8 : 1,
                  boxShadow:
                    confirmTone === "danger"
                      ? "0 10px 24px rgba(239,68,68,0.18)"
                      : "0 10px 24px rgba(37,99,235,0.18)",
                }}
              >
                {isSubmitting ? "处理中..." : confirmLabel}
              </button>
            </div>
          </section>
        </Overlay>
      , document.body)
        : null}
    </>
  );
}

function Overlay({
  children,
  onDismiss,
}: {
  children: ReactNode;
  onDismiss: () => void;
}) {
  return (
    <div
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onDismiss();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        overflowY: "auto",
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
  background: "rgba(255,255,255,0.86)",
  padding: "12px 16px",
  borderRadius: 999,
  fontWeight: 700,
} satisfies CSSProperties;

const primaryButtonStyle = {
  border: "1px solid transparent",
  padding: "12px 16px",
  borderRadius: 999,
  color: "var(--primary-foreground)",
  fontWeight: 700,
} satisfies CSSProperties;
