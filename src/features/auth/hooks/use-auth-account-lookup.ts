"use client";

import { useEffect } from "react";
import { z } from "zod";

import type { AuthAccountLookupStatus } from "@/features/auth/components/auth-preview-state";
import { useAuthPreviewState } from "@/features/auth/components/auth-preview-state";
import { hasAppwritePublicEnv } from "@/shared/lib/appwrite/env";

const emailSchema = z.email();

type LookupResponse = {
  status?: AuthAccountLookupStatus | "invalid";
};

export function useAuthAccountLookup(email: string) {
  const { setPreloginAccountStatus } = useAuthPreviewState();
  const normalizedEmail = email.trim();

  useEffect(() => {
    if (!normalizedEmail) {
      setPreloginAccountStatus("idle");
      return;
    }

    if (!emailSchema.safeParse(normalizedEmail).success) {
      setPreloginAccountStatus("idle");
      return;
    }

    if (!hasAppwritePublicEnv) {
      setPreloginAccountStatus("unknown");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setPreloginAccountStatus("checking");

      try {
        const response = await fetch(
          `/api/auth/lookup?email=${encodeURIComponent(normalizedEmail)}`,
          {
            signal: controller.signal,
          },
        );
        const payload = (await response.json().catch(() => null)) as LookupResponse | null;

        if (!response.ok || !payload?.status || payload.status === "invalid") {
          setPreloginAccountStatus("unknown");
          return;
        }

        setPreloginAccountStatus(payload.status);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setPreloginAccountStatus("unknown");
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedEmail, setPreloginAccountStatus]);
}
