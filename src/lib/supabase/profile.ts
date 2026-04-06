import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile, ProfileFormValues } from "@/features/auth/types/profile.types";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  updated_at: string | null;
};

function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    fullName: row.full_name ?? "",
    email: row.email ?? "",
    avatarUrl: row.avatar_url ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export async function fetchProfile(userId: string) {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from("profiles")
    .select("id, full_name, email, avatar_url, updated_at")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }

    throw error;
  }

  return mapProfileRow(data);
}

export async function upsertProfile(userId: string, email: string, values: ProfileFormValues) {
  const client = getSupabaseBrowserClient();

  if (!client) {
    throw new Error("Supabase client is unavailable.");
  }

  const { data, error } = await client
    .from("profiles")
    .upsert(
      {
        id: userId,
        email,
        full_name: values.fullName,
        avatar_url: values.avatarUrl || null,
      },
      {
        onConflict: "id",
      },
    )
    .select("id, full_name, email, avatar_url, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return mapProfileRow(data);
}
