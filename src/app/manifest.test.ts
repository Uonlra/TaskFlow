import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";

describe("manifest", () => {
  it("返回可安装 PWA 所需核心字段", () => {
    const result = manifest();

    expect(result.display).toBe("standalone");
    expect(result.start_url).toBe("/");
    expect(result.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: "/icons/icon-192.png", sizes: "192x192" }),
        expect.objectContaining({ src: "/icons/icon-512.png", sizes: "512x512" }),
      ]),
    );
  });
});
