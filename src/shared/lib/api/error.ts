import { NextResponse } from "next/server";

import { AppwriteRequestError } from "@/shared/lib/appwrite/server";

const statusMessages: Record<number, string> = {
  400: "请求参数有误，请检查后再试。",
  401: "登录已失效，请重新登录。",
  403: "没有权限执行此操作。",
  404: "没有找到这条任务。",
  409: "数据冲突，请刷新后重试。",
  429: "操作过于频繁，请稍后再试。",
};

export function handleApiError(
  error: unknown,
  fallbackMessage = "服务暂时不可用，请稍后再试。",
): NextResponse {
  if (error instanceof AppwriteRequestError) {
    const status = error.status || 500;
    const message = statusMessages[status] ?? fallbackMessage;
    return NextResponse.json({ message }, { status });
  }

  return NextResponse.json({ message: fallbackMessage }, { status: 500 });
}
