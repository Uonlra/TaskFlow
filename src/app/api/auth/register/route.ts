import { NextResponse, type NextRequest } from "next/server";

import { registerSchema } from "@/features/auth/schemas/register-schema";
import { hasAppwriteAuthEnv } from "@/lib/appwrite/env";
import {
  AppwriteRequestError,
  registerEmailPasswordAccount,
} from "@/lib/appwrite/server";
import { attachAppwriteSessionCookie } from "@/lib/appwrite/session";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid register payload." },
      { status: 400 },
    );
  }

  if (!hasAppwriteAuthEnv) {
    return NextResponse.json(
      { message: "Appwrite is not configured." },
      { status: 503 },
    );
  }

  try {
    const result = await registerEmailPasswordAccount({
      ...parsed.data,
      request,
    });
    const response = NextResponse.json({
      ...result.envelope,
      verificationRequested: result.verificationRequested,
    });
    attachAppwriteSessionCookie(response, {
      secret: result.secret,
      expire: result.expire,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof AppwriteRequestError || error instanceof Error
            ? error.message
            : "Registration failed.",
      },
      { status: 400 },
    );
  }
}
