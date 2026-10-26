// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PwaProvider } from "@/shared/providers/pwa-provider";

const runtimeMocks = vi.hoisted(() => ({
  getRuntimePlatform: vi.fn(() => "web"),
}));

vi.mock("@/platform/runtime", () => ({
  getRuntimePlatform: runtimeMocks.getRuntimePlatform,
}));

describe("PwaProvider", () => {
  const registerMock = vi.fn();

  beforeEach(() => {
    runtimeMocks.getRuntimePlatform.mockReturnValue("web");
    registerMock.mockReset();

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        register: registerMock.mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("在 web 端注册 service worker", async () => {
    render(
      <PwaProvider>
        <div>child</div>
      </PwaProvider>,
    );

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith("/sw.js", { scope: "/" });
    });
  });

  it("在原生运行时跳过 service worker 注册", async () => {
    runtimeMocks.getRuntimePlatform.mockReturnValue("capacitor");

    render(
      <PwaProvider>
        <div>child</div>
      </PwaProvider>,
    );

    await waitFor(() => {
      expect(runtimeMocks.getRuntimePlatform).toHaveBeenCalled();
    });

    expect(registerMock).not.toHaveBeenCalled();
  });
});
