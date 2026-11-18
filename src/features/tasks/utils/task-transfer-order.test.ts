import { describe, expect, it } from "vitest";
import { orderTaskTransfers } from "./task-transfer-order";

describe("transfer sync ordering", () => {
  const source = { taskId: "source", payload: {} };
  const target = { taskId: "target", payload: { evolution: { origin: { taskId: "source" } } } };
  it("sends sources first, including nested transfers and later source edits", () => {
    const child = { taskId: "child", payload: { evolution: { origin: { taskId: "target" } } } };
    expect(orderTaskTransfers([child, target, source])).toEqual([source, target, child]);
    const later = { ...source };
    expect(orderTaskTransfers([target, source, later])).toHaveLength(3);
  });
  it("ignores detached imported links and refuses circular dependencies", () => {
    const imported = {
      ...target,
      payload: { evolution: { ...target.payload.evolution, detachedTaskLinksThrough: 0 } },
    };
    expect(orderTaskTransfers([imported, source])).toEqual([imported, source]);
    expect(() =>
      orderTaskTransfers([target, { ...source, payload: { evolution: { origin: { taskId: "target" } } } }]),
    ).toThrow("循环");
  });
});
