import { NextResponse, type NextRequest } from "next/server";

import { destroyCurrentSession } from "@/lib/appwrite/server";
import {
  clearAppwriteSessionCookie,
  getAppwriteSessionSecret,
} from "@/lib/appwrite/session";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const sessionSecret = await getAppwriteSessionSecret();

  if (sessionSecret) {
    try {
      await destroyCurrentSession(sessionSecret, request);
    } catch {
      // Cookie clearing is enough to end the local session even if Appwrite revocation fails.
    }
  }

  clearAppwriteSessionCookie(response);
  return response;
}
