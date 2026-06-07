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
  triggerClassName?: string;
  triggerStyle?: CSSProperties;
  confirmTone?: "default" | "danger";
};

export function ConfirmDialog({
  triggerLabel,
  title,
  description,
  confirmLabel = "确认",
  onConfirm,
  triggerClassName,
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
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName} style={triggerStyle}>
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
            className="confirm-dialog card-surface"
          >
            <p
              className={
                confirmTone === "danger"
                  ? "section-eyebrow confirm-dialog__eyebrow confirm-dialog__eyebrow--danger"
                  : "section-eyebrow confirm-dialog__eyebrow"
              }
            >
              请确认操作
            </p>
            <h2 className="confirm-dialog__title">{title}</h2>
            <p className="confirm-dialog__description">{description}</p>
            {submitError ? <p className="confirm-dialog__error">{submitError}</p> : null}
            <div className="confirm-dialog__actions">
              <button type="button" onClick={() => setOpen(false)} className="tesla-action tesla-action--secondary">
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className={
                  confirmTone === "danger"
                    ? "tesla-action tesla-action--danger confirm-dialog__confirm-danger"
                    : "tesla-action tesla-action--primary"
                }
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
      className="dialog-overlay"
    >
      {children}
    </div>
  );
}
