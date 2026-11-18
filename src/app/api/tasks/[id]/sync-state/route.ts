import { NextResponse, type NextRequest } from "next/server";
import { getCurrentAuthEnvelope } from "@/shared/lib/appwrite/server";
import { getAppwriteSessionSecret } from "@/shared/lib/appwrite/session";
import { getTask } from "@/shared/lib/appwrite/tasks";
import { handleApiError } from "@/shared/lib/api/error";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const secret = await getAppwriteSessionSecret();
  const auth = await getCurrentAuthEnvelope();
  if (!secret || !auth?.user) return NextResponse.json({ message: "请先登录后再处理同步。" }, { status: 401 });
  try {
    const { id } = await context.params;
    return NextResponse.json({ task: await getTask(secret, id, request, true) });
  } catch (error) {
    return handleApiError(error, "无法读取云端版本，请稍后重试。");
  }
}
