import "server-only";

import type { TaskPageInitialData } from "@/features/tasks/types/task.types";
import { getCurrentAccount } from "@/shared/lib/appwrite/server";
import { getAppwriteSessionSecret } from "@/shared/lib/appwrite/session";
import { canUseAppwriteTaskPage, listTasks, listTasksPage } from "@/shared/lib/appwrite/tasks";
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
    const pageNumber = parseTaskPageParam(pageValue ?? null);
    const accountPromise = getCurrentAccount(sessionSecret);
    const pagePromise = canUseAppwriteTaskPage(filters)
      ? listTasksPage(sessionSecret, filters, pageNumber)
      : listTasks(sessionSecret).then((tasks) => getTaskPage(tasks, filters, pageNumber));
    const [account, page] = await Promise.all([accountPromise, pagePromise]);

    return {
      userId: account.$id,
      ...page,
    };
  } catch {
    return null;
  }
}
