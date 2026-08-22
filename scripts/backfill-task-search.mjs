const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID;
const tableId = process.env.APPWRITE_TASKS_TABLE_ID;
const pageSize = 100;
const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

if (!endpoint || !projectId || !apiKey || !databaseId || !tableId) {
  throw new Error(
    "Missing Appwrite configuration. Set NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID, and APPWRITE_TASKS_TABLE_ID.",
  );
}

const rowsPath = `/tablesdb/${databaseId}/tables/${tableId}/rows`;
let offset = 0;
let scanned = 0;
let updated = 0;
let skipped = 0;

try {
  while (true) {
    const payload = await appwriteRequest(rowsPath, {
      queries: [query("limit", undefined, pageSize), query("offset", undefined, offset)],
    });
    const rows = Array.isArray(payload.rows) ? payload.rows : [];

    if (!rows.length) break;

    for (const row of rows) {
      scanned += 1;
      const searchText = buildSearchText(row);

      if (!force && row.searchText === searchText) {
        skipped += 1;
        continue;
      }

      if (!dryRun) {
        await appwriteRequest(`${rowsPath}/${encodeURIComponent(row.$id)}`, {
          method: "PATCH",
          body: { data: { searchText } },
        });
      }

      updated += 1;
    }

    offset += rows.length;
    console.log(`Scanned ${scanned} rows; ${dryRun ? "would update" : "updated"} ${updated}.`);

    if (rows.length < pageSize) break;
  }

  console.log(`${dryRun ? "Dry run complete" : "Backfill complete"}: scanned=${scanned}, updated=${updated}, skipped=${skipped}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

function buildSearchText(row) {
  const title = typeof row.title === "string" && row.title ? row.title : row.taskName;
  const description = typeof row.description === "string" ? row.description : "";
  const tags = Array.isArray(row.tags) ? row.tags : [];

  return [title, description, ...tags]
    .filter((value) => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
}

function query(method, attribute, value) {
  return JSON.stringify({
    method,
    ...(attribute === undefined ? {} : { attribute }),
    ...(value === undefined ? {} : { values: [value] }),
  });
}

async function appwriteRequest(path, options = {}) {
  const url = new URL(`${endpoint.replace(/\/$/, "")}${path}`);

  for (const queryValue of options.queries ?? []) {
    url.searchParams.append("queries[]", queryValue);
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": projectId,
      "X-Appwrite-Key": apiKey,
      "X-Appwrite-Response-Format": "1.8.0",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || `Appwrite request failed with status ${response.status}.`);
  }

  return payload;
}
