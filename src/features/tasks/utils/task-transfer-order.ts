/** Put an available source snapshot before its independently queued descendants. */
export function orderTaskTransfers<T extends { taskId: string; payload?: unknown }>(operations: T[]): T[] {
  const byId = new Map(operations.map((operation) => [operation.taskId, operation]));
  const visiting = new Set<T>();
  const done = new Set<T>();
  const ordered: T[] = [];
  function visit(operation: T) {
    if (done.has(operation)) return;
    if (visiting.has(operation)) throw new Error("任务来源关系存在循环，已保留同步队列。");
    visiting.add(operation);
    const payload = operation.payload;
    if (payload && typeof payload === "object" && "evolution" in payload) {
      const evolution = payload.evolution;
      if (
        evolution &&
        typeof evolution === "object" &&
        !("detachedTaskLinksThrough" in evolution) &&
        "origin" in evolution
      ) {
        const origin = evolution.origin;
        if (origin && typeof origin === "object" && "taskId" in origin && typeof origin.taskId === "string") {
          const source = byId.get(origin.taskId);
          if (source) visit(source);
        }
      }
    }
    visiting.delete(operation);
    done.add(operation);
    ordered.push(operation);
  }
  operations.forEach(visit);
  return ordered;
}
