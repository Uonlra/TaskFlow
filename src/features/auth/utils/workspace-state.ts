export type WorkspaceState = "auth-checking" | "guest" | "syncing" | "account-empty" | "ready";

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
