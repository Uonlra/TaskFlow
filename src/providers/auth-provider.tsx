"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { Profile, ProfileFormValues } from "@/features/auth/types/profile.types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { fetchProfile, upsertProfile } from "@/lib/supabase/profile";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  isConfigured: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  saveProfile: (values: ProfileFormValues) => Promise<Profile | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(hasSupabaseEnv);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const loadProfile = async (nextUser: User | null) => {
    if (!nextUser) {
      setProfile(null);
      setIsProfileLoading(false);
      return;
    }

    if (!hasSupabaseEnv) {
      setProfile({
        id: nextUser.id,
        fullName: (nextUser.user_metadata?.name as string | undefined) ?? "演示用户",
        email: nextUser.email ?? "",
      });
      setIsProfileLoading(false);
      return;
    }

    setIsProfileLoading(true);

    try {
      const nextProfile = await fetchProfile(nextUser.id);

      setProfile(
        nextProfile ?? {
          id: nextUser.id,
          fullName: (nextUser.user_metadata?.name as string | undefined) ?? "",
          email: nextUser.email ?? "",
        },
      );
    } finally {
      setIsProfileLoading(false);
    }
  };

  useEffect(() => {
    const client = getSupabaseBrowserClient();

    if (!client) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    client.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }

      setSession(data.session);
      setUser(data.session?.user ?? null);
      setIsLoading(false);
      void loadProfile(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsLoading(false);
      void loadProfile(nextSession?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      isLoading,
      isProfileLoading,
      isConfigured: hasSupabaseEnv,
      signOut: async () => {
        const client = getSupabaseBrowserClient();

        if (!client) {
          return;
        }

        await client.auth.signOut();
        setProfile(null);
      },
      refreshProfile: async () => {
        await loadProfile(user);
      },
      saveProfile: async (values) => {
        if (!user) {
          return null;
        }

        if (!hasSupabaseEnv) {
          const nextProfile = {
            id: user.id,
            fullName: values.fullName,
            email: user.email ?? "",
            avatarUrl: values.avatarUrl || undefined,
          };

          setProfile(nextProfile);
          return nextProfile;
        }

        const nextProfile = await upsertProfile(user.id, user.email ?? "", values);
        setProfile(nextProfile);
        return nextProfile;
      },
    }),
    [isLoading, isProfileLoading, profile, session, user],
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
