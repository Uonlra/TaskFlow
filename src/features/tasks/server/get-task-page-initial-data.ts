import "server-only";

import type { TaskPageInitialData } from "@/features/tasks/types/task.types";
import { getCurrentAccount } from "@/shared/lib/appwrite/server";
import { getAppwriteSessionSecret } from "@/shared/lib/appwrite/session";
import { listTasks } from "@/shared/lib/appwrite/tasks";

export async function getTaskPageInitialData(): Promise<TaskPageInitialData | null> {
  const sessionSecret = await getAppwriteSessionSecret();

  if (!sessionSecret) {
    return null;
  }

  try {
    const [account, tasks] = await Promise.all([getCurrentAccount(sessionSecret), listTasks(sessionSecret)]);

    return {
      userId: account.$id,
      tasks,
    };
  } catch {
    return null;
  }
}
