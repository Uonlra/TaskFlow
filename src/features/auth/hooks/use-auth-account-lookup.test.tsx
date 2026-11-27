// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthAccountLookup } from "@/features/auth/hooks/use-auth-account-lookup";

vi.mock("@/shared/lib/appwrite/env", () => ({
  hasAppwritePublicEnv: true,
}));

describe("useAuthAccountLookup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("空邮箱保持 idle 且不请求接口", () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(new Response());

    const { result } = renderHook(() => useAuthAccountLookup(""));

    expect(result.current).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("非法邮箱保持 idle 且不请求接口", () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(new Response());

    const { result } = renderHook(() => useAuthAccountLookup("invalid-email"));

    expect(result.current).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("合法邮箱等待 450ms 后请求接口并更新为 registered", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "registered",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const { result } = renderHook(() => useAuthAccountLookup(" demo@example.com "));

    expect(result.current).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(450);
    });

    expect(result.current).toBe("registered");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/lookup?email=demo%40example.com",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("接口请求失败时更新为 unknown", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network unavailable"));

    const { result } = renderHook(() => useAuthAccountLookup("demo@example.com"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(450);
    });

    expect(result.current).toBe("unknown");
  });
});
