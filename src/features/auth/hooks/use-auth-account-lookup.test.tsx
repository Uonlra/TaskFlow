// @vitest-environment jsdom

import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthPreviewStateProvider, useAuthPreviewState } from "@/features/auth/components/auth-preview-state";
import { useAuthAccountLookup } from "@/features/auth/hooks/use-auth-account-lookup";

vi.mock("@/shared/lib/appwrite/env", () => ({
  hasAppwritePublicEnv: true,
}));

function Wrapper({ children }: { children: ReactNode }) {
  return <AuthPreviewStateProvider>{children}</AuthPreviewStateProvider>;
}

function useLookupHarness(email: string) {
  useAuthAccountLookup(email);
  return useAuthPreviewState().preloginAccountStatus;
}

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

    const { result } = renderHook(() => useLookupHarness(""), { wrapper: Wrapper });

    expect(result.current).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("非法邮箱保持 idle 且不请求接口", () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(new Response());

    const { result } = renderHook(() => useLookupHarness("invalid-email"), { wrapper: Wrapper });

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

    const { result } = renderHook(() => useLookupHarness(" demo@example.com "), { wrapper: Wrapper });

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

    const { result } = renderHook(() => useLookupHarness("demo@example.com"), { wrapper: Wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(450);
    });

    expect(result.current).toBe("unknown");
  });
});
