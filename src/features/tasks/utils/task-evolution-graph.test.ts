import { describe, expect, it } from "vitest";
import {
  buildEvolutionGraph,
  buildEvolutionGraphRows,
  compactEvolutionRows,
  projectEvolutionGraph,
  EVOLUTION_ROW_HEIGHT,
} from "./task-evolution-graph";
import { graphFixture, graphCommand } from "../../../../test/fixtures/task-evolution";

describe("evolution graph topology", () => {
  it("compresses ordinary labels in previews while retaining every hidden joint and exact merge source", () => {
    const state = graphCommand(graphFixture(), "last-note", {
      type: "record_progress",
      branchId: "a",
      note: "继续推进",
    });
    const topology = buildEvolutionGraph(state);
    const rows = compactEvolutionRows(buildEvolutionGraphRows(topology, false, new Set()));
    expect(rows.every((row) => row.type === "event")).toBe(true);
    const hidden = rows.flatMap((row) => (row.type === "event" ? (row.hiddenBefore ?? []) : []));
    expect(hidden).toEqual(expect.arrayContaining(["last-note", "main-note", "note-a"]));
    const projected = projectEvolutionGraph(topology, rows, 100);
    expect(projected.paths.filter((path) => path.edge.kind === "merge").map((path) => path.edge.from)).toEqual([
      "ra",
      "ra",
    ]);
    expect(projected.paths.some((path) => path.edge.from === "last-note" && path.continuation)).toBe(true);
  });
  it("keeps main events on lane zero and parallel explorations on distinct lanes", () => {
    const graph = buildEvolutionGraph(graphFixture());
    expect(graph.nodes.filter((node) => node.main).every((node) => node.lane === 0)).toBe(true);
    expect(graph.lanes.get("a")).not.toBe(graph.lanes.get("b"));
    expect(graph.nodes.find((node) => node.event.id === "a")?.marker).toBe("fork");
    expect(graph.edges.find((edge) => edge.to === "ra")?.from).toBe("note-a");
  });

  it("merges from the exact result version twice without ending that branch", () => {
    const graph = buildEvolutionGraph(graphFixture());
    const merges = graph.edges.filter((edge) => edge.kind === "merge");
    expect(merges.map((edge) => [edge.from, edge.to])).toEqual([
      ["ra", "m1"],
      ["ra", "m2"],
    ]);
    expect(graph.edges.find((edge) => edge.id === "head:a")?.from).toBe("ra2");
    expect(graph.nodes.find((node) => node.event.id === "ra2")?.lane).toBe(graph.lanes.get("a"));
  });

  it("keeps pause and end nodes without inventing a merge, and reuses safe lanes", () => {
    const graph = buildEvolutionGraph(graphFixture());
    expect(graph.nodes.find((node) => node.event.id === "pause-b")?.marker).toBe("paused");
    expect(graph.nodes.find((node) => node.event.id === "end-c")?.marker).toBe("ended");
    expect(graph.edges.some((edge) => edge.kind === "merge" && ["b", "c"].includes(edge.branchId!))).toBe(false);
    expect(graph.edges.some((edge) => edge.id === "head:b" || edge.id === "head:c")).toBe(false);
    expect(graph.lanes.get("b")).toBe(graph.lanes.get("c"));
  });

  it("preserves the original merge after withdrawal and keeps the withdrawal on main", () => {
    const graph = buildEvolutionGraph(graphFixture());
    expect(graph.edges.find((edge) => edge.to === "m2" && edge.kind === "merge")).toMatchObject({
      from: "ra",
      withdrawn: true,
    });
    expect(graph.nodes.find((node) => node.event.id === "w2")).toMatchObject({ lane: 0, marker: "withdrawn" });
  });

  it("does not recycle an ended branch lane before a later adoption uses its result", () => {
    let state = graphFixture();
    state = graphCommand(state, "d", { type: "create_branch", title: "另一方案", question: "能否复用通道？" });
    state = graphCommand(state, "m-c", {
      type: "adopt_result",
      branchId: "c",
      resultId: "rc",
      pointIds: ["rc:0"],
      reason: "后续采纳",
      goal: state.goal,
    });
    const graph = buildEvolutionGraph(state);
    expect(graph.lanes.get("d")).not.toBe(graph.lanes.get("c"));
    const merge = graph.edges.find((edge) => edge.id === "merge:m-c");
    expect(merge).toMatchObject({ from: "rc", to: "m-c", lane: graph.lanes.get("c") });
  });

  it("reallocates overlapping lanes when an older paused branch is resumed", () => {
    let state = graphFixture();
    state = graphCommand(state, "resume-b", {
      type: "set_branch_status",
      branchId: "b",
      status: "exploring",
      reason: "继续验证",
    });
    const graph = buildEvolutionGraph(state);
    expect(graph.lanes.get("b")).not.toBe(graph.lanes.get("c"));
    expect(graph.edges.find((edge) => edge.id === "head:b")?.from).toBe("resume-b");
    expect(graph.edges.filter((edge) => edge.kind === "merge" && edge.branchId === "b")).toHaveLength(0);
    expect(graph.edges.find((edge) => edge.to === "resume-b")?.from).toBe("pause-b");
  });

  it("uses revision order for events with identical timestamps", () => {
    const state = graphFixture();
    state.events.reverse();
    const graph = buildEvolutionGraph(state);
    expect(graph.nodes.map((node) => node.event.revision)).toEqual([...graph.nodes.keys()]);
  });
});

describe("collapsed and paged graph projection", () => {
  it("keeps an offscreen fork bend outside the visible page", () => {
    let state = graphCommand(graphFixture(), "new-branch", {
      type: "create_branch",
      title: "新方案",
      question: "是否适用？",
    });
    for (let index = 0; index < 10; index++)
      state = graphCommand(state, `main-${index}`, { type: "record_progress", note: "主线继续推进" });
    const graph = buildEvolutionGraph(state);
    const view = projectEvolutionGraph(graph, buildEvolutionGraphRows(graph, true, new Set()), 3);
    const fork = view.paths.find((path) => path.edge.id === "head:new-branch")!;
    expect(fork.continuation).toBe(true);
    const firstSegment = fork.d.split("C").slice(0, 2).join("C");
    const coords = firstSegment.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const ys = coords.filter((_value, index) => index % 2 === 1);
    // Every control point of the actual bend is below the viewport; only its
    // already-separated branch rail may continue into the visible rows.
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(view.height);
  });
  it("preserves lane assignments and edges when ordinary events are folded", () => {
    const graph = buildEvolutionGraph(graphFixture());
    const rows = buildEvolutionGraphRows(graph, false, new Set());
    expect(rows.filter((row) => row.type === "gap").flatMap((row) => (row.type === "gap" ? row.eventIds : []))).toEqual(
      ["main-note", "note-a"],
    );
    const view = projectEvolutionGraph(graph, rows, 30);
    expect(view.paths.some((path) => path.continuation)).toBe(true);
    expect(view.paths.filter((path) => path.edge.kind === "merge")).toHaveLength(2);
    expect(view.paths.every((path) => path.d && !/NaN|Infinity/.test(path.d))).toBe(true);
    const expanded = buildEvolutionGraphRows(graph, false, new Set(["note-a"]));
    expect(expanded.find((row) => row.id === "note-a")?.type).toBe("event");
    expect(projectEvolutionGraph(graph, expanded, 30).width).toBe(view.width);
  });

  it("clips old endpoints with a continuation rather than fabricating visible origins", () => {
    const graph = buildEvolutionGraph(graphFixture());
    const rows = buildEvolutionGraphRows(graph, true, new Set());
    const view = projectEvolutionGraph(graph, rows, 5);
    expect(view.height).toBe(5 * EVOLUTION_ROW_HEIGHT);
    expect(view.remaining).toBe(rows.length - 5);
    expect(view.rows.some((row) => row.id === "a")).toBe(false);
    expect(view.paths.some((path) => path.edge.branchId === "a" && path.continuation)).toBe(true);
    expect(view.paths.every((path) => !/NaN|Infinity/.test(path.d))).toBe(true);
  });
});
