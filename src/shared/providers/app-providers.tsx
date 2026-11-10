"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/features/auth/providers/auth-provider";
import { LenisProvider } from "@/shared/providers/lenis-provider";
import { ToastProvider } from "@/shared/providers/toast-provider";
import { DesktopChrome } from "@/shared/components/layout/desktop-chrome";

export function AppProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.replace(/\/$/, "") === "/quick-create") return children;
  return (
    <AuthProvider>
      <ToastProvider>
        <DesktopChrome />
        <LenisProvider>{children}</LenisProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
