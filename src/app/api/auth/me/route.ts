import { NextResponse } from "next/server";

import { getCurrentAuthEnvelope } from "@/lib/appwrite/server";
import { clearAppwriteSessionCookie } from "@/lib/appwrite/session";

export async function GET() {
  const envelope = await getCurrentAuthEnvelope();

  if (!envelope) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  if (!envelope.user.emailVerified) {
    const response = NextResponse.json(
      { message: "请先完成邮箱验证。" },
      { status: 403 },
    );
    clearAppwriteSessionCookie(response);
    return response;
  }

  return NextResponse.json(envelope);
}
