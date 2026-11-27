"use client";

import "@/styles/auth.css";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { AuthExhibitionShell } from "@/features/auth/components/auth-exhibition-shell";
import { getAuthReturnPath } from "@/features/auth/utils/get-auth-return-path";
import { useAuth } from "@/features/auth/providers/auth-provider";

export default function DesktopAuthLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isLoading, isConfigured } = useAuth();

  useEffect(() => {
    if (isConfigured && !isLoading && user)
      router.replace(getAuthReturnPath(new URLSearchParams(window.location.search).get("next")));
  }, [isConfigured, isLoading, router, user]);

  if (isConfigured && !isLoading && user) return null;
  return <AuthExhibitionShell>{children}</AuthExhibitionShell>;
}
