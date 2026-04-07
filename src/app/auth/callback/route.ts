import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

function getLoginRedirectUrl(request: NextRequest, reason?: string) {
  const redirectUrl = new URL("/login", request.url);

  if (reason) {
    redirectUrl.searchParams.set("reason", reason);
  }

  return redirectUrl;
}

export async function GET(request: NextRequest) {
  if (!supabaseUrl || !supabasePublishableKey) {
    return NextResponse.redirect(getLoginRedirectUrl(request, "missing-config"));
  }

  const nextPath = request.nextUrl.searchParams.get("next") || "/dashboard";
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;

  let response = NextResponse.redirect(new URL(nextPath, request.url));

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        response = NextResponse.redirect(new URL(nextPath, request.url));

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return response;
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      return response;
    }
  }

  return NextResponse.redirect(getLoginRedirectUrl(request, "auth-callback-failed"));
}
