import { NextResponse, type NextRequest } from "next/server";

import { AppwriteRequestError, verifyEmailAddress } from "@/lib/appwrite/server";

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as
    | { userId?: string; secret?: string }
    | null;

  if (!payload?.userId || !payload.secret) {
    return NextResponse.json(
      { message: "缺少邮箱验证参数。" },
      { status: 400 },
    );
  }

  try {
    await verifyEmailAddress({
      userId: payload.userId,
      secret: payload.secret,
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof AppwriteRequestError || error instanceof Error
            ? error.message
            : "邮箱验证失败，请稍后再试。",
      },
      { status: 400 },
    );
  }
}
