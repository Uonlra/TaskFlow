import { NextResponse, type NextRequest } from "next/server";

import { loginSchema } from "@/features/auth/schemas/login-schema";
import { hasAppwriteAuthEnv } from "@/lib/appwrite/env";
import {
  createEmailPasswordSession,
  AppwriteRequestError,
  destroyCurrentSession,
  sendEmailVerification,
  UnverifiedEmailError,
} from "@/lib/appwrite/server";
import {
  attachAppwriteSessionCookie,
  clearAppwriteSessionCookie,
} from "@/lib/appwrite/session";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid login payload." },
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
    const result = await createEmailPasswordSession({
      ...parsed.data,
      request,
    });
    const response = NextResponse.json(result.envelope);
    attachAppwriteSessionCookie(response, {
      secret: result.secret,
      expire: result.expire,
    });
    return response;
  } catch (error) {
    if (error instanceof UnverifiedEmailError) {
      const verificationRequested = await sendEmailVerification(
        error.sessionSecret,
        request,
      );
      await destroyCurrentSession(error.sessionSecret, request).catch(() => undefined);

      const response = NextResponse.json(
        {
          message: verificationRequested
            ? "该账号尚未完成邮箱验证，已重新发送验证邮件，请先完成验证。"
            : "该账号尚未完成邮箱验证，请先完成验证后再登录。",
          requiresEmailVerification: true,
          verificationRequested,
        },
        { status: 403 },
      );
      clearAppwriteSessionCookie(response);
      return response;
    }

    return NextResponse.json(
      {
        message:
          error instanceof AppwriteRequestError || error instanceof Error
            ? error.message
            : "Login failed.",
      },
      { status: 401 },
    );
  }
}
