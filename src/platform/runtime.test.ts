// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { getRuntimePlatform, isCapacitorRuntime, isStandalonePwa, isTauriRuntime } from "@/platform/runtime";

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(window, "__TAURI__");
  Reflect.deleteProperty(window, "Capacitor");
});

describe("runtime platform detection", () => {
  it("识别 Tauri 运行时", () => {
    Object.defineProperty(window, "__TAURI__", {
      configurable: true,
      value: {},
    });

    expect(isTauriRuntime()).toBe(true);
    expect(getRuntimePlatform()).toBe("tauri");
  });

  it("识别 Capacitor 运行时", () => {
    Object.defineProperty(window, "Capacitor", {
      configurable: true,
      value: {
        isNativePlatform: () => true,
      },
    });

    expect(isCapacitorRuntime()).toBe(true);
    expect(getRuntimePlatform()).toBe("capacitor");
  });

  it("识别独立安装模式的 PWA", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));

    expect(isStandalonePwa()).toBe(true);
    expect(getRuntimePlatform()).toBe("pwa");
  });

  it("默认回退为 Web 平台", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));

    expect(getRuntimePlatform()).toBe("web");
  });
});
