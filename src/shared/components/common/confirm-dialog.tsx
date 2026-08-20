"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
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
  const titleId = useId();
  const descriptionId = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  const closeDialog = () => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

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

    cancelButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        closeDialog();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.removeProperty("overflow");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSubmitting, mounted, open]);

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab" || !dialogRef.current) {
      return;
    }

    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    const first = focusable[0];
    const last = focusable.at(-1);

    if (!first || !last) {
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onConfirm();
      closeDialog();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "操作失败，请稍后再试。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName}
        style={triggerStyle}
      >
        {triggerLabel}
      </button>
      {open && mounted
        ? createPortal(
            <Overlay
              onDismiss={() => {
                if (!isSubmitting) {
                  closeDialog();
                }
              }}
            >
              <section
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                className="confirm-dialog card-surface"
                onKeyDown={handleDialogKeyDown}
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
                <h2 id={titleId} className="confirm-dialog__title">
                  {title}
                </h2>
                <p id={descriptionId} className="confirm-dialog__description">
                  {description}
                </p>
                {submitError ? (
                  <p className="confirm-dialog__error" role="alert">
                    {submitError}
                  </p>
                ) : null}
                <div className="confirm-dialog__actions">
                  <button
                    ref={cancelButtonRef}
                    type="button"
                    onClick={closeDialog}
                    disabled={isSubmitting}
                    className="tesla-action tesla-action--secondary"
                  >
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
            </Overlay>,
            document.body,
          )
        : null}
    </>
  );
}

function Overlay({ children, onDismiss }: { children: ReactNode; onDismiss: () => void }) {
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
