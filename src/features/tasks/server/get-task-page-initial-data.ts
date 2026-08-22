import "server-only";

import type { TaskPageInitialData } from "@/features/tasks/types/task.types";
import { getCurrentAccount } from "@/shared/lib/appwrite/server";
import { getAppwriteSessionSecret } from "@/shared/lib/appwrite/session";
import { listTasks } from "@/shared/lib/appwrite/tasks";
import { getTaskPage, parseTaskPageParam } from "@/features/tasks/utils/task-list-query";
import type { TaskFilters } from "@/features/tasks/types/task-filters";

const defaultFilters: TaskFilters = {
  query: "",
  tag: "",
  status: "all",
  priority: "all",
  due: "",
  risk: "",
  date: "",
  range: "",
  sort: "due_asc",
};

export async function getTaskPageInitialData(
  filters: TaskFilters = defaultFilters,
  pageValue?: string,
): Promise<TaskPageInitialData | null> {
  const sessionSecret = await getAppwriteSessionSecret();

  if (!sessionSecret) {
    return null;
  }

  try {
    const [account, tasks] = await Promise.all([getCurrentAccount(sessionSecret), listTasks(sessionSecret)]);
    const page = getTaskPage(tasks, filters, parseTaskPageParam(pageValue ?? null));

    return {
      userId: account.$id,
      ...page,
    };
  } catch {
    return null;
  }
}
