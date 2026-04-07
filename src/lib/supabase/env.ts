export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const publicSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : undefined);

export const hasSupabaseEnv = Boolean(supabaseUrl && supabasePublishableKey);

export function getPublicSiteUrl(path = "") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (publicSiteUrl) {
    return `${publicSiteUrl.replace(/\/$/, "")}${normalizedPath}`;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}${normalizedPath}`;
  }

  return normalizedPath;
}
