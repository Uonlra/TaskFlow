import { NextResponse, type NextRequest } from "next/server";

import { hasAppwriteAuthEnv } from "@/lib/appwrite/env";
import { verifyEmailAddress } from "@/lib/appwrite/server";

function getLoginRedirectUrl(request: NextRequest, reason?: string) {
  const redirectUrl = new URL("/login", request.url);

  if (reason) {
    redirectUrl.searchParams.set("reason", reason);
  }

  return redirectUrl;
}

export async function GET(request: NextRequest) {
  if (!hasAppwriteAuthEnv) {
    return NextResponse.redirect(getLoginRedirectUrl(request, "missing-config"));
  }

  const nextPath = request.nextUrl.searchParams.get("next") || "/dashboard";
  const userId = request.nextUrl.searchParams.get("userId");
  const secret = request.nextUrl.searchParams.get("secret");

  if (!userId || !secret) {
    return NextResponse.redirect(getLoginRedirectUrl(request, "missing-verification"));
  }

  try {
    await verifyEmailAddress({
      userId,
      secret,
      request,
    });

    return NextResponse.redirect(new URL(nextPath, request.url));
  } catch {
    return NextResponse.redirect(getLoginRedirectUrl(request, "auth-callback-failed"));
  }
}
