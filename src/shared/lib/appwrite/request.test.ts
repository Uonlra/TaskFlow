import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/shared/lib/appwrite/env", () => ({
  appwriteEndpoint: "https://cloud.example.test/v1",
  appwriteProjectId: "project-1",
  appwriteApiKey: undefined,
}));

import { appwriteFetch } from "@/shared/lib/appwrite/request";

describe("appwriteFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", mocks.fetch);
  });

  it("以 queries[] 形式发送 Appwrite 数组查询参数", async () => {
    await appwriteFetch({
      path: "/tablesdb/database-1/tables/tasks-1/rows",
      searchParams: { queries: ['equal("status","todo")', "limit(50)"], page: 1 },
    });

    const url = new URL(mocks.fetch.mock.calls[0][0] as string);
    expect(url.searchParams.getAll("queries[]")).toEqual(['equal("status","todo")', "limit(50)"]);
    expect(url.searchParams.getAll("queries")).toEqual([]);
    expect(url.searchParams.get("page")).toBe("1");
  });
});
