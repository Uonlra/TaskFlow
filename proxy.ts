import { NextResponse, type NextRequest } from "next/server";

import { appwriteSessionCookieName, hasAppwriteAuthEnv } from "@/shared/lib/appwrite/env";
import { createCorsPreflightResponse, withApiCors } from "@/shared/lib/api/cors";

const protectedPages = ["/settings"];
const protectedApiPrefixes = ["/api/tasks", "/api/profile"];

export function proxy(request: NextRequest) {
  const isApiRequest = request.nextUrl.pathname.startsWith("/api/");

  if (isApiRequest && request.method === "OPTIONS") {
    return createCorsPreflightResponse(request);
  }

  if (!hasAppwriteAuthEnv) {
    return isApiRequest ? withApiCors(NextResponse.next(), request) : NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  const isProtectedPage = protectedPages.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const isProtectedApi = protectedApiPrefixes.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
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
