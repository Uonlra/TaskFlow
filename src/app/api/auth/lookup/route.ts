import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getPublicAccountStatusByEmail } from "@/lib/appwrite/server";

const lookupSchema = z.object({
  email: z.email(),
});

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email") ?? "";
  const parsed = lookupSchema.safeParse({ email });

  if (!parsed.success) {
    return NextResponse.json(
      { status: "invalid", message: "请输入有效的邮箱地址。" },
      { status: 400 },
    );
  }

  const status = await getPublicAccountStatusByEmail(parsed.data.email, request);

  return NextResponse.json({
    status,
    message: getLookupMessage(status),
  });
}

function getLookupMessage(status: "registered" | "available" | "unknown") {
  if (status === "registered") {
    return "这个邮箱看起来已经有记录了。登录后再展示真实进度。";
  }

  if (status === "available") {
    return "这个邮箱还没有记录。注册后就从 0 开始整理。";
  }

  return "暂时无法确认账号状态。可以继续登录或注册，真实进度会在登录后显示。";
}
