import { NextResponse, type NextRequest } from "next/server";

function getLoginRedirectUrl(request: NextRequest) {
  const redirectUrl = new URL("/login", request.url);
  redirectUrl.searchParams.set("reason", "registered");

  return redirectUrl;
}

export async function GET(request: NextRequest) {
  return NextResponse.redirect(getLoginRedirectUrl(request));
}
