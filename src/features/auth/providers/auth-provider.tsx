"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { AuthSession, AuthUser } from "@/features/auth/types/auth.types";
import type { Profile, ProfileFormValues } from "@/features/auth/types/profile.types";
import { hasAppwritePublicEnv } from "@/shared/lib/appwrite/env";
import { useTaskStore } from "@/features/tasks/store/task-store";

type AuthContextValue = {
  user: AuthUser | null;
  session: AuthSession | null;
  profile: Profile | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  isConfigured: boolean;
  isAuthenticated: boolean;
  applyAuthEnvelope: (envelope: AuthEnvelope) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  saveProfile: (values: ProfileFormValues) => Promise<Profile | null>;
};

export type AuthEnvelope = {
  user: AuthUser;
  profile: Profile;
  session: AuthSession | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const clearTasks = useTaskStore((state) => state.clearTasks);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(hasAppwritePublicEnv);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  useEffect(() => {
    if (!hasAppwritePublicEnv) {
      setSession(null);
      setUser(null);
      setProfile(null);
      clearTasks();
      setIsLoading(false);
      return;
    }

    let mounted = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 4000);

    void (async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store", signal: controller.signal });

        if (!mounted) return;

        if (!response.ok) {
          setSession(null);
          setUser(null);
          setProfile(null);
          clearTasks();
          return;
        }

        const payload = (await response.json()) as { user: AuthUser; profile: Profile; session: AuthSession | null };
        setSession(payload.session ?? null);
        setUser(payload.user);
        setProfile(payload.profile);
      } catch {
        if (!mounted) return;
        setSession(null);
        setUser(null);
        setProfile(null);
        clearTasks();
      } finally {
        window.clearTimeout(timeoutId);
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [clearTasks]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      isLoading,
      isProfileLoading,
      isConfigured: hasAppwritePublicEnv,
      isAuthenticated: Boolean(user),
      applyAuthEnvelope: (envelope) => {
        setSession(envelope.session ?? null);
        setUser(envelope.user);
        setProfile(envelope.profile);
      },
      signOut: async () => {
        if (hasAppwritePublicEnv) {
          await fetch("/api/auth/logout", { method: "POST" });
        }
        setSession(null);
        setUser(null);
        setProfile(null);
        clearTasks();
      },
      refreshProfile: async () => {
        if (!hasAppwritePublicEnv || !user) return;

        setIsProfileLoading(true);
        try {
          const response = await fetch("/api/profile", { cache: "no-store" });
          if (!response.ok) throw new Error("无法刷新当前资料。");

          const payload = (await response.json()) as { profile: Profile };
          setProfile(payload.profile);
          setUser((current) =>
            current ? { ...current, name: payload.profile.fullName, email: payload.profile.email } : current,
          );
        } finally {
          setIsProfileLoading(false);
        }
      },
      saveProfile: async (values) => {
        if (!hasAppwritePublicEnv || !user) {
          throw new Error("请先登录后再保存资料。");
        }

        setIsProfileLoading(true);
        try {
          const response = await fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          });
          const payload = (await response.json().catch(() => null)) as { profile?: Profile; message?: string } | null;

          if (!response.ok || !payload?.profile) {
            throw new Error(payload?.message || "资料保存失败。");
          }

          const savedProfile = payload.profile;
          setProfile(savedProfile);
          setUser((current) =>
            current ? { ...current, name: savedProfile.fullName, email: savedProfile.email } : current,
          );
          return savedProfile;
        } finally {
          setIsProfileLoading(false);
        }
      },
    }),
    [clearTasks, isLoading, isProfileLoading, profile, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth 必须在 AuthProvider 内部使用。");
  return context;
}
