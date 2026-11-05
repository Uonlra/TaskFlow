const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT?.replace(/\/$/, "");
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID;
const tableId = process.env.APPWRITE_TASKS_TABLE_ID;
const columnKeys = ["syncClientUpdatedAt", "deletedAt"];

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

for (const columnKey of columnKeys) {
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
    console.log(`已创建可选 datetime 字段 ${columnKey}，等待 available。`);
  } else {
    throw new Error(`检查同步字段失败：${existing.payload?.message ?? existing.response.status}`);
  }
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    const status = await appwriteRequest(`${tablePath}/columns/${columnKey}`);
    if (!status.response.ok) throw new Error(`检查 ${columnKey} 状态失败：HTTP ${status.response.status}`);
    if (status.payload?.status === "available") {
      ready = true;
      break;
    }
    if (["failed", "stuck"].includes(status.payload?.status))
      throw new Error(`字段 ${columnKey} 未就绪：${status.payload.status}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!ready) throw new Error(`字段 ${columnKey} 等待超时，请先确认状态再部署 API。`);
  console.log(`同步字段 ${columnKey} 已 available。`);
}
