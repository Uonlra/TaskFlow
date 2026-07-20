import { NextResponse, type NextRequest } from "next/server";

import { registerSchema } from "@/features/auth/schemas/register-schema";
import { hasAppwriteAuthEnv } from "@/shared/lib/appwrite/env";
import {
  AppwriteRequestError,
  registerEmailPasswordAccount,
} from "@/shared/lib/appwrite/server";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "注册信息格式不正确。" },
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
    const result = await registerEmailPasswordAccount({
      ...parsed.data,
      request,
    });

    return NextResponse.json(
      {
        ...result.envelope,
        message: "账号已创建，请登录。",
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof AppwriteRequestError || error instanceof Error
            ? error.message
            : "注册失败，请稍后再试。",
      },
      { status: 400 },
    );
  }
}
