import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { TaskEvolutionError } from "@/features/tasks/domain/task-evolution";
const mocks = vi.hoisted(() => ({ secret: vi.fn(), auth: vi.fn(), execute: vi.fn() }));
vi.mock("@/shared/lib/appwrite/session", () => ({ getAppwriteSessionSecret: mocks.secret }));
vi.mock("@/shared/lib/appwrite/server", () => ({
  getCurrentAuthEnvelope: mocks.auth,
  AppwriteRequestError: class extends Error {},
}));
vi.mock("@/shared/lib/appwrite/tasks", () => ({ executeTaskEvolutionRemote: mocks.execute }));
import { POST } from "./route";
const context = { params: Promise.resolve({ id: "t" }) };
const command = {
  operationId: "b",
  expectedRevision: 0,
  action: { type: "create_branch", title: "A", question: "有效吗？" },
};
const request = (body: unknown) =>
  new NextRequest("http://localhost/api/tasks/t/evolution", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.secret.mockResolvedValue("session");
  mocks.auth.mockResolvedValue({ user: { id: "owner" } });
});
it("rejects unauthenticated and malformed requests without mutations", async () => {
  mocks.secret.mockResolvedValueOnce(null);
  expect((await POST(request(command), context)).status).toBe(401);
  expect((await POST(request({ ...command, expectedRevision: -1 }), context)).status).toBe(400);
  expect(mocks.execute).not.toHaveBeenCalled();
});
it("passes the authenticated session to row-scoped storage and returns its result", async () => {
  mocks.execute.mockResolvedValue({ id: "t", evolution: { revision: 1 } });
  const response = await POST(request(command), context);
  expect(response.status).toBe(200);
  expect(mocks.execute).toHaveBeenCalledWith("session", "t", command, expect.any(NextRequest));
  expect((await response.json()).task.evolution.revision).toBe(1);
});
it("returns actionable conflicts without reporting a successful save", async () => {
  mocks.execute.mockRejectedValue(new TaskEvolutionError("conflict", "任务已有新的修改"));
  const response = await POST(request(command), context);
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ message: "任务已有新的修改", code: "conflict" });
});
