import type { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { appwriteSessionCookieName, publicSiteUrl } from "@/shared/lib/appwrite/env";

const desktopAllowedOrigins = new Set(
  (process.env.DESKTOP_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const cookieBaseOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: shouldUseSecureCookies(),
};

export async function getAppwriteSessionSecret() {
  const cookieStore = await cookies();
  return cookieStore.get(appwriteSessionCookieName)?.value ?? null;
}

export function attachAppwriteSessionCookie(
  response: NextResponse,
  input: { secret: string; expire?: string | null },
  request?: Request,
) {
  response.cookies.set(appwriteSessionCookieName, input.secret, {
    ...getCookieOptions(request),
    expires: input.expire ? new Date(input.expire) : undefined,
  });
}

export function clearAppwriteSessionCookie(response: NextResponse, request?: Request) {
  response.cookies.set(appwriteSessionCookieName, "", {
    ...getCookieOptions(request),
    maxAge: 0,
  });
}

function getCookieOptions(request?: Request) {
  const origin = request?.headers.get("origin");
  const isDesktopRequest = Boolean(origin && desktopAllowedOrigins.has(origin));

  return {
    ...cookieBaseOptions,
    sameSite: isDesktopRequest ? ("none" as const) : cookieBaseOptions.sameSite,
    secure: isDesktopRequest ? true : cookieBaseOptions.secure,
  };
}

function shouldUseSecureCookies() {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  if (!publicSiteUrl) {
    return true;
  }

  try {
    const url = new URL(publicSiteUrl);
    return !["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return true;
  }
}
