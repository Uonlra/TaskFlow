const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT?.replace(/\/$/, "");
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID;
const tableId = process.env.APPWRITE_TASKS_TABLE_ID;
const columnKey = "syncClientUpdatedAt";

if (!endpoint || !projectId || !apiKey || !databaseId || !tableId) {
  throw new Error("缺少 Appwrite 环境变量，无法检查任务表同步字段。");
}

const tablePath = `/tablesdb/${encodeURIComponent(databaseId)}/tables/${encodeURIComponent(tableId)}`;

async function appwriteRequest(path, options = {}) {
  const response = await fetch(`${endpoint}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": projectId,
      "X-Appwrite-Key": apiKey,
      "X-Appwrite-Response-Format": "1.8.0",
    },
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

const existing = await appwriteRequest(`${tablePath}/columns/${columnKey}`);
if (existing.response.ok) {
  console.log(`任务表字段 ${columnKey} 已存在，状态：${existing.payload?.status ?? "未知"}。`);
} else if (existing.response.status === 404) {
  const created = await appwriteRequest(`${tablePath}/columns/datetime`, {
    method: "POST",
    body: JSON.stringify({ key: columnKey, required: false }),
  });
  if (!created.response.ok) {
    throw new Error(`创建同步字段失败：${created.payload?.message ?? created.response.status}`);
  }
  console.log(`已创建可选 datetime 字段 ${columnKey}；请等状态变为 available 后部署同步 API。`);
} else {
  throw new Error(`检查同步字段失败：${existing.payload?.message ?? existing.response.status}`);
}
