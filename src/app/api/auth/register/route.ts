import { NextResponse, type NextRequest } from "next/server";

import { registerSchema } from "@/features/auth/schemas/register-schema";
import { hasAppwriteAuthEnv } from "@/lib/appwrite/env";
import {
  AppwriteRequestError,
  destroyCurrentSession,
  registerEmailPasswordAccount,
} from "@/lib/appwrite/server";
import {
  attachAppwriteSessionCookie,
  clearAppwriteSessionCookie,
} from "@/lib/appwrite/session";

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

    const isVerified = result.envelope.user.emailVerified;
    const status = isVerified ? 200 : 202;
    const response = NextResponse.json(
      {
        ...result.envelope,
        verificationRequested: result.verificationRequested,
        requiresEmailVerification: !isVerified,
        message: !isVerified
          ? result.verificationRequested
            ? "账号已创建，请先完成邮箱验证后再登录。"
            : "账号已创建，但验证邮件发送失败，请稍后在登录页重试。"
          : undefined,
      },
      { status },
    );

    if (isVerified) {
      attachAppwriteSessionCookie(response, {
        secret: result.secret,
        expire: result.expire,
      });
    } else {
      await destroyCurrentSession(result.secret, request).catch(() => undefined);
      clearAppwriteSessionCookie(response);
    }

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
