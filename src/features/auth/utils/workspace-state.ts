export type WorkspaceState = "auth-checking" | "guest" | "syncing" | "account-empty" | "ready";

export function getWorkspaceErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";

  if (!message || message.includes("请先登录")) {
    return fallback;
  }

  return message;
}

type GetWorkspaceStateInput = {
  isAuthLoading: boolean;
  isTaskLoading: boolean;
  taskCount: number;
  userId?: string | null;
};

export function getWorkspaceState({
  isAuthLoading,
  isTaskLoading,
  taskCount,
  userId,
}: GetWorkspaceStateInput): WorkspaceState {
  if (isAuthLoading) return "auth-checking";
  if (!userId) return "guest";
  if (isTaskLoading) return "syncing";
  return taskCount === 0 ? "account-empty" : "ready";
}
