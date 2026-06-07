"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type AuthAccountLookupStatus =
  | "idle"
  | "checking"
  | "registered"
  | "available"
  | "unknown";

type AuthPreviewState = {
  preloginName: string;
  preloginEmail: string;
  preloginAccountStatus: AuthAccountLookupStatus;
  setPreloginName: (name: string) => void;
  setPreloginEmail: (email: string) => void;
  setPreloginAccountStatus: (status: AuthAccountLookupStatus) => void;
};

const AuthPreviewStateContext = createContext<AuthPreviewState | null>(null);

export function AuthPreviewStateProvider({ children }: { children: ReactNode }) {
  const [preloginName, setPreloginName] = useState("");
  const [preloginEmail, setPreloginEmail] = useState("");
  const [preloginAccountStatus, setPreloginAccountStatus] =
    useState<AuthAccountLookupStatus>("idle");
  const value = useMemo(
    () => ({
      preloginName,
      preloginEmail,
      preloginAccountStatus,
      setPreloginName,
      setPreloginEmail,
      setPreloginAccountStatus,
    }),
    [preloginAccountStatus, preloginEmail, preloginName],
  );

  return (
    <AuthPreviewStateContext.Provider value={value}>
      {children}
    </AuthPreviewStateContext.Provider>
  );
}

export function useAuthPreviewState() {
  const context = useContext(AuthPreviewStateContext);

  if (!context) {
    throw new Error("useAuthPreviewState must be used within AuthPreviewStateProvider.");
  }

  return context;
}
