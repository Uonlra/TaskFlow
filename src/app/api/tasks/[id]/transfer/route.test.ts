import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskEvolutionError } from "@/features/tasks/domain/task-evolution";
import { branchTransferFixture } from "../../../../../../test/fixtures/task-branch-transfer";
const mocks = vi.hoisted(() => ({ secret: vi.fn(), auth: vi.fn(), transfer: vi.fn() }));
vi.mock("@/shared/lib/appwrite/session", () => ({ getAppwriteSessionSecret: mocks.secret }));
vi.mock("@/shared/lib/appwrite/server", () => ({ getCurrentAuthEnvelope: mocks.auth }));
vi.mock("@/shared/lib/appwrite/tasks", () => ({ transferTaskBranchRemote: mocks.transfer }));
import { POST } from "./route";
const { command } = branchTransferFixture();
const context = { params: Promise.resolve({ id: "source" }) };
const request = (body: unknown) =>
  new NextRequest("http://localhost/api/tasks/source/transfer", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.secret.mockResolvedValue("session");
  mocks.auth.mockResolvedValue({ user: { id: "owner" } });
});

describe("branch transfer API", () => {
  it("requires authentication before processing transfer fields", async () => {
    mocks.secret.mockResolvedValue(null);
    expect((await POST(request(command), context)).status).toBe(401);
    expect(mocks.transfer).not.toHaveBeenCalled();
  });
  it("accepts only the transfer command and uses the authenticated owner", async () => {
    expect((await POST(request({ ...command, action: { type: "complete", note: "完成" } }), context)).status).toBe(400);
    mocks.transfer.mockResolvedValue({ source: { id: "source" }, task: { id: "new" } });
    const response = await POST(request(command), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ source: { id: "source" }, task: { id: "new" } });
    expect(mocks.transfer).toHaveBeenCalledWith("session", "owner", "source", command, expect.any(NextRequest));
  });
  it("returns a conflict without pretending that a target was created", async () => {
    mocks.transfer.mockRejectedValue(new TaskEvolutionError("conflict", "任务已有新的修改"));
    const response = await POST(request(command), context);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ message: "任务已有新的修改" });
  });
});
