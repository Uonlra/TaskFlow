import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ secret: vi.fn(), auth: vi.fn(), task: vi.fn(), error: vi.fn() }));
vi.mock("@/shared/lib/appwrite/session", () => ({ getAppwriteSessionSecret: mocks.secret }));
vi.mock("@/shared/lib/appwrite/server", () => ({ getCurrentAuthEnvelope: mocks.auth }));
vi.mock("@/shared/lib/appwrite/tasks", () => ({ getTask: mocks.task }));
vi.mock("@/shared/lib/api/error", () => ({ handleApiError: mocks.error }));
import { GET } from "./route";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.secret.mockResolvedValue("session");
  mocks.auth.mockResolvedValue({ user: { id: "account" } });
});
it("rejects an anonymous read without touching task storage", async () => {
  mocks.secret.mockResolvedValue(null);
  expect(
    (await GET(new NextRequest("http://localhost/api/tasks/id/sync-state"), { params: Promise.resolve({ id: "id" }) }))
      .status,
  ).toBe(401);
  expect(mocks.task).not.toHaveBeenCalled();
});
it("reads tombstones through the current user session so they can be compared safely", async () => {
  const task = { id: "id", deletedAt: "2026-11-18T00:00:00.000Z" };
  mocks.task.mockResolvedValue(task);
  const request = new NextRequest("http://localhost/api/tasks/id/sync-state");
  expect(await (await GET(request, { params: Promise.resolve({ id: "id" }) })).json()).toEqual({ task });
  expect(mocks.task).toHaveBeenCalledWith("session", "id", request, true);
});
