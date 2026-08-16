import type { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { appwriteSessionCookieName, publicSiteUrl } from "@/shared/lib/appwrite/env";

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

export function attachAppwriteSessionCookie(response: NextResponse, input: { secret: string; expire?: string | null }) {
  response.cookies.set(appwriteSessionCookieName, input.secret, {
    ...cookieBaseOptions,
    expires: input.expire ? new Date(input.expire) : undefined,
  });
}

export function clearAppwriteSessionCookie(response: NextResponse) {
  response.cookies.set(appwriteSessionCookieName, "", {
    ...cookieBaseOptions,
    maxAge: 0,
  });
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
