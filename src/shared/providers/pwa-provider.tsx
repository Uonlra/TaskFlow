"use client";

import { useEffect, type ReactNode } from "react";

import { getRuntimePlatform } from "@/platform/runtime";

type PwaProviderProps = {
  children: ReactNode;
};

export function PwaProvider({ children }: PwaProviderProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      return;
    }

    const platform = getRuntimePlatform();

    if (platform === "capacitor" || platform === "tauri") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js", { scope: "/" });
  }, []);

  return <>{children}</>;
}
