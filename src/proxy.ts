import { NextResponse, type NextRequest } from "next/server";

import { appwriteSessionCookieName, hasAppwriteAuthEnv } from "@/shared/lib/appwrite/env";
import { createCorsPreflightResponse, withApiCors } from "@/shared/lib/api/cors";
import { isAllowedDesktopOrigin } from "@/shared/lib/api/desktop-origins";

const protectedPages = ["/settings"];
const protectedApiPrefixes = ["/api/tasks", "/api/profile"];

export function proxy(request: NextRequest) {
  const isApiRequest = request.nextUrl.pathname.startsWith("/api/");

  if (isApiRequest && request.method === "OPTIONS") {
    return createCorsPreflightResponse(request);
  }

  if (isApiRequest && !["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin && !isAllowedDesktopOrigin(origin)) {
      return NextResponse.json({ message: "请求来源不受信任。" }, { status: 403 });
    }
  }

  if (!hasAppwriteAuthEnv) {
    return isApiRequest ? withApiCors(NextResponse.next(), request) : NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  const isProtectedPage = protectedPages.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const isProtectedApi = protectedApiPrefixes.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (!isProtectedPage && !isProtectedApi) {
    return isApiRequest ? withApiCors(NextResponse.next(), request) : NextResponse.next();
  }

  const sessionCookie = request.cookies.get(appwriteSessionCookieName)?.value;

  if (!sessionCookie) {
    if (isProtectedApi) {
      return withApiCors(NextResponse.json({ message: "请先登录后再执行此操作。" }, { status: 401 }), request);
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  return isApiRequest ? withApiCors(NextResponse.next(), request) : NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
