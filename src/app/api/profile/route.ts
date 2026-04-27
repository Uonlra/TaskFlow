import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentAccount, toProfile, updateCurrentProfile } from "@/lib/appwrite/server";
import { getAppwriteSessionSecret } from "@/lib/appwrite/session";

const profileSchema = z.object({
  fullName: z.string().trim().min(1, "姓名不能为空。").max(128, "姓名最多 128 个字符。"),
  avatarUrl: z.string().trim().max(2048, "头像地址过长。"),
});

export async function GET(request: NextRequest) {
  const sessionSecret = await getAppwriteSessionSecret();

  if (!sessionSecret) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const account = await getCurrentAccount(sessionSecret, request);
  return NextResponse.json({ profile: toProfile(account, account.email ?? "") });
}

export async function PATCH(request: NextRequest) {
  const sessionSecret = await getAppwriteSessionSecret();

  if (!sessionSecret) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid profile payload." },
      { status: 400 },
    );
  }

  const profile = await updateCurrentProfile(sessionSecret, parsed.data, request);
  return NextResponse.json({ profile });
}
