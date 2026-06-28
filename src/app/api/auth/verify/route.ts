import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "当前项目不需要邮箱验证，请直接登录。" },
    { status: 410 },
  );
}
