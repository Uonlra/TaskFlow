import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { hasSupabaseEnv, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

export async function getSupabaseServerClient() {
  if (!hasSupabaseEnv || !supabaseUrl || !supabasePublishableKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components can't always write cookies during render.
          // Middleware is responsible for refreshing the session in that case.
        }
      },
    },
  });
}
