"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { apiFetch } from "@/shared/lib/api/client";
import { hasAppwritePublicEnv } from "@/shared/lib/appwrite/env";

const emailSchema = z.email();
type Status = "registered" | "available" | "unknown";

export function useAuthAccountLookup(email: string) {
  const key = email.trim();
  const [result, setResult] = useState<{ email: string; status: Status } | null>(null);
  useEffect(() => {
    if (!hasAppwritePublicEnv || !emailSchema.safeParse(key).success) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      let status: Status = "unknown";
      try {
        const response = await apiFetch(`/api/auth/lookup?email=${encodeURIComponent(key)}`, {
          signal: controller.signal,
        });
        if (response.ok) {
          const payload = await response.json();
          if (payload?.status === "available" || payload?.status === "registered") status = payload.status;
        }
      } catch {
        // The form remains usable when account lookup is unavailable.
      }
      if (!controller.signal.aborted) setResult({ email: key, status });
    }, 450);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [key]);
  return result?.email === key ? result.status : "idle";
}
