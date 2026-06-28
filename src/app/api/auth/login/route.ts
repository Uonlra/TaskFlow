import { NextResponse, type NextRequest } from "next/server";

import { loginSchema } from "@/features/auth/schemas/login-schema";
import { hasAppwriteAuthEnv } from "@/lib/appwrite/env";
import {
  createEmailPasswordSession,
  AppwriteRequestError,
} from "@/lib/appwrite/server";
import { attachAppwriteSessionCookie } from "@/lib/appwrite/session";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "登录信息格式不正确。" },
      { status: 400 },
    );
  }

  if (!hasAppwriteAuthEnv) {
    return NextResponse.json(
      { message: "Appwrite 还没有配置完成。" },
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
    return NextResponse.json(
      {
        message:
          error instanceof AppwriteRequestError || error instanceof Error
            ? error.message
            : "登录失败，请稍后再试。",
      },
      { status: 401 },
    );
  }
}
