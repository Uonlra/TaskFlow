import { NextResponse, type NextRequest } from "next/server";
import { taskEvolutionCommandSchema } from "@/features/tasks/schemas/task-evolution-schema";
import { getCurrentAuthEnvelope } from "@/shared/lib/appwrite/server";
import { getAppwriteSessionSecret } from "@/shared/lib/appwrite/session";
import { transferTaskBranchRemote } from "@/shared/lib/appwrite/tasks";
import { handleApiError } from "@/shared/lib/api/error";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const secret = await getAppwriteSessionSecret();
  const auth = await getCurrentAuthEnvelope();
  if (!secret || !auth?.user) return NextResponse.json({ message: "请先登录后再转出分支。" }, { status: 401 });
  const parsed = taskEvolutionCommandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.action.type !== "transfer_branch")
    return NextResponse.json({ message: "分支转出字段不符合要求。" }, { status: 400 });
  try {
    const { id } = await context.params;
    return NextResponse.json(await transferTaskBranchRemote(secret, auth.user.id, id, parsed.data, request));
  } catch (error) {
    return handleApiError(error, "无法转出分支，请稍后重试。");
  }
}
