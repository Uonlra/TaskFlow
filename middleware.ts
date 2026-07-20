import { NextResponse, type NextRequest } from "next/server";

import { appwriteSessionCookieName, hasAppwriteAuthEnv } from "@/shared/lib/appwrite/env";

const protectedPages = ["/dashboard", "/tasks", "/settings"];
const protectedApiPrefixes = ["/api/tasks", "/api/profile"];

export function middleware(request: NextRequest) {
  if (!hasAppwriteAuthEnv) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  const isProtectedPage = protectedPages.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const isProtectedApi = protectedApiPrefixes.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(appwriteSessionCookieName)?.value;

  if (!sessionCookie) {
    if (isProtectedApi) {
      return NextResponse.json(
        { message: "请先登录后再执行此操作。" },
        { status: 401 },
      );
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
