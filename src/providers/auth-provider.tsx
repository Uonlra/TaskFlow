"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { AuthSession, AuthUser } from "@/features/auth/types/auth.types";
import type { Profile, ProfileFormValues } from "@/features/auth/types/profile.types";
import { hasAppwritePublicEnv } from "@/lib/appwrite/env";
import { useTaskStore } from "@/store/task-store";

type AuthContextValue = {
  user: AuthUser | null;
  session: AuthSession | null;
  profile: Profile | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  isConfigured: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  saveProfile: (values: ProfileFormValues) => Promise<Profile | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const demoStorageKey = "taskflow-demo-profile";

export function AuthProvider({ children }: { children: ReactNode }) {
  const clearTasks = useTaskStore((state) => state.clearTasks);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(hasAppwritePublicEnv);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  useEffect(() => {
    if (!hasAppwritePublicEnv) {
      const demoProfile = readDemoProfile();
      const nextProfile =
        demoProfile ?? {
          id: "demo-user",
          fullName: "演示用户",
          email: "demo@example.com",
        };

      setUser({
        id: nextProfile.id,
        email: nextProfile.email,
        name: nextProfile.fullName,
        emailVerified: true,
      });
      setProfile(nextProfile);
      setSession(null);
      setIsLoading(false);
      return;
    }

    let mounted = true;

    void (async () => {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (!mounted) {
          return;
        }

        if (!response.ok) {
          setSession(null);
          setUser(null);
          setProfile(null);
          clearTasks();
          setIsLoading(false);
          return;
        }

        const payload = (await response.json()) as {
          user: AuthUser;
          profile: Profile;
          session: AuthSession | null;
        };

        setSession(payload.session ?? null);
        setUser(payload.user);
        setProfile(payload.profile);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
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
      signOut: async () => {
        if (!hasAppwritePublicEnv) {
          return;
        }

        await fetch("/api/auth/logout", {
          method: "POST",
        });
        setSession(null);
        setUser(null);
        setProfile(null);
        clearTasks();
      },
      refreshProfile: async () => {
        if (!hasAppwritePublicEnv) {
          const nextProfile = readDemoProfile();

          if (nextProfile) {
            setProfile(nextProfile);
            setUser({
              id: nextProfile.id,
              email: nextProfile.email,
              name: nextProfile.fullName,
              emailVerified: true,
            });
          }

          return;
        }

        if (!user) {
          return;
        }

        setIsProfileLoading(true);

        try {
          const response = await fetch("/api/profile", {
            cache: "no-store",
          });

          if (!response.ok) {
            throw new Error("无法刷新当前资料。");
          }

          const payload = (await response.json()) as { profile: Profile };
          setProfile(payload.profile);
          setUser((current) =>
            current
              ? {
                  ...current,
                  name: payload.profile.fullName,
                  email: payload.profile.email,
                }
              : current,
          );
        } finally {
          setIsProfileLoading(false);
        }
      },
      saveProfile: async (values) => {
        if (!hasAppwritePublicEnv) {
          const nextProfile = {
            id: user?.id ?? "demo-user",
            fullName: values.fullName,
            email: user?.email ?? "demo@example.com",
            avatarUrl: values.avatarUrl || undefined,
          };

          writeDemoProfile(nextProfile);
          setProfile(nextProfile);
          setUser({
            id: nextProfile.id,
            email: nextProfile.email,
            name: nextProfile.fullName,
            emailVerified: true,
          });
          return nextProfile;
        }

        if (!user) {
          return null;
        }

        setIsProfileLoading(true);

        try {
          const response = await fetch("/api/profile", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(values),
          });

          const payload = (await response.json().catch(() => null)) as
            | { profile?: Profile; message?: string }
            | null;

          if (!response.ok || !payload?.profile) {
            throw new Error(payload?.message || "资料保存失败。");
          }

          setProfile(payload.profile);
          setUser((current) =>
            current
              ? {
                  ...current,
                  name: payload.profile?.fullName ?? current.name,
                  email: payload.profile?.email ?? current.email,
                }
              : current,
          );

          return payload.profile;
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

  if (!context) {
    throw new Error("useAuth 必须在 AuthProvider 内部使用。");
  }

  return context;
}

function readDemoProfile(): Profile | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(demoStorageKey);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as Profile;
  } catch {
    return null;
  }
}

function writeDemoProfile(profile: Profile) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(demoStorageKey, JSON.stringify(profile));
}
