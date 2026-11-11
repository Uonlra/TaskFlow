const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT?.replace(/\/$/, "");
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID;
const tableId = process.env.APPWRITE_TASKS_TABLE_ID;
if (!endpoint || !projectId || !apiKey || !databaseId || !tableId) throw new Error("缺少 Appwrite 环境变量。");
const tablePath = `/tablesdb/${encodeURIComponent(databaseId)}/tables/${encodeURIComponent(tableId)}`;
async function request(path, method = "GET", body) {
  const response = await fetch(`${endpoint}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": projectId,
      "X-Appwrite-Key": apiKey,
      "X-Appwrite-Response-Format": "1.8.0",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}
// Fail before any schema change if the deployment does not support transactions.
const probe = await request("/tablesdb/transactions", "POST", { ttl: 60 });
if (!probe.response.ok || !probe.payload?.$id)
  throw new Error("云端事务不可用，请检查 Appwrite 版本和 API Key 权限后重试。");
const rollback = await request(`/tablesdb/transactions/${encodeURIComponent(probe.payload.$id)}`, "PATCH", {
  rollback: true,
});
if (!rollback.response.ok) throw new Error("事务回滚探测失败。");
for (const column of [
  { key: "evolutionJson", type: "string", size: 1048576 },
  { key: "evolutionFence", type: "boolean" },
]) {
  const existing = await request(`${tablePath}/columns/${column.key}`);
  if (existing.response.status === 404) {
    const { type, ...data } = column;
    const created = await request(`${tablePath}/columns/${type}`, "POST", { ...data, required: false });
    if (!created.response.ok)
      throw new Error(`创建 ${column.key} 失败：${created.payload?.message ?? created.response.status}`);
  } else if (!existing.response.ok) throw new Error(`检查 ${column.key} 失败：HTTP ${existing.response.status}`);
  else if (
    existing.payload.type !== column.type ||
    existing.payload.required ||
    (column.size && existing.payload.size < column.size)
  ) {
    throw new Error(`${column.key} 已存在但类型、容量或 required 不兼容，请检查表结构。`);
  }
  let ready = false;
  for (let i = 0; i < 120; i++) {
    const status = await request(`${tablePath}/columns/${column.key}`);
    if (!status.response.ok || ["failed", "stuck"].includes(status.payload?.status))
      throw new Error(`${column.key} 尚未就绪。`);
    if (status.payload?.status === "available") {
      ready = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!ready) throw new Error(`${column.key} 等待超时。`);
  console.log(`${column.key} 已就绪。`);
}
