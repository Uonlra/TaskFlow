import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/shared/lib/api/error";
import { getCurrentAccount, toProfile, updateCurrentProfile } from "@/shared/lib/appwrite/server";
import { getAppwriteSessionSecret } from "@/shared/lib/appwrite/session";

const profileSchema = z.object({
  fullName: z.string().trim().min(1, "姓名不能为空。").max(128, "姓名最多 128 个字符。"),
  avatarUrl: z.string().trim().max(2048, "头像地址过长。"),
});

export async function GET(request: NextRequest) {
  const sessionSecret = await getAppwriteSessionSecret();

  if (!sessionSecret) {
    return NextResponse.json({ message: "请先登录后再查看资料。" }, { status: 401 });
  }

  try {
    const account = await getCurrentAccount(sessionSecret, request);
    return NextResponse.json({ profile: toProfile(account, account.email ?? "") });
  } catch (error) {
    return handleApiError(error, "无法加载个人资料，请稍后再试。");
  }
}

export async function PATCH(request: NextRequest) {
  const sessionSecret = await getAppwriteSessionSecret();

  if (!sessionSecret) {
    return NextResponse.json({ message: "请先登录后再保存资料。" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "资料信息格式不正确。" },
      { status: 400 },
    );
  }

  try {
    const profile = await updateCurrentProfile(sessionSecret, parsed.data, request);
    return NextResponse.json({ profile });
  } catch (error) {
    return handleApiError(error, "保存资料失败，请稍后再试。");
  }
}
