"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastInput = Omit<ToastItem, "id">;

type ToastContextValue = {
  showToast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (input: ToastInput) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

      setToasts((current) => [...current, { id, ...input }]);

      window.setTimeout(() => {
        dismissToast(id);
      }, 3600);
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          zIndex: 100,
          display: "grid",
          gap: 12,
          width: "min(360px, calc(100vw - 32px))",
        }}
      >
        {toasts.map((toast) => (
          <article
            key={toast.id}
            className="card-surface"
            style={{
              borderRadius: 22,
              padding: 16,
              borderColor:
                toast.tone === "success"
                  ? "rgba(44,122,90,0.28)"
                  : toast.tone === "error"
                    ? "rgba(178,64,55,0.3)"
                    : "rgba(199,91,57,0.22)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
              <div>
                <p
                  style={{
                    margin: 0,
                    color:
                      toast.tone === "success"
                        ? "var(--success)"
                        : toast.tone === "error"
                          ? "var(--danger)"
                          : "var(--primary)",
                    fontWeight: 800,
                  }}
                >
                  {toast.title}
                </p>
                {toast.description ? (
                  <p style={{ margin: "8px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>{toast.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "var(--muted)",
                  fontSize: "1rem",
                }}
              >
                x
              </button>
            </div>
          </article>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast 必须在 ToastProvider 内部使用。");
  }

  return context;
}
