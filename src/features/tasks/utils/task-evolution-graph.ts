import { curveBumpY, line } from "d3-shape";
import type { TaskEvolution, TaskEvolutionEvent } from "@/features/tasks/types/task-evolution.types";

export const EVOLUTION_ROW_HEIGHT = 56;
export const EVOLUTION_LANE_WIDTH = 22;
export const EVOLUTION_GRAPH_INSET = 18;
export const EVOLUTION_PAGE_SIZE = 30;

export type EvolutionGraphNode = {
  event: TaskEvolutionEvent;
  lane: number;
  branchId?: string;
  main: boolean;
  marker: "event" | "fork" | "merge" | "paused" | "ended" | "withdrawn";
};
export type EvolutionGraphEdge = {
  id: string;
  from: string;
  to: string | null;
  branchId?: string;
  lane: number;
  kind: "main" | "fork" | "branch" | "merge";
  withdrawn?: boolean;
};
export type EvolutionGraphTopology = {
  nodes: EvolutionGraphNode[];
  edges: EvolutionGraphEdge[];
  lanes: Map<string, number>;
  laneCount: number;
};
export type EvolutionGraphRow =
  | { type: "event"; id: string; node: EvolutionGraphNode; hiddenBefore?: string[] }
  | { type: "gap"; id: string; eventIds: string[] };

export function buildEvolutionGraph(evolution: TaskEvolution): EvolutionGraphTopology {
  // Revision order is authoritative, even when clocks coincide or move backwards.
  const events = [...evolution.events].sort((a, b) => a.revision - b.revision);
  const byId = new Map(events.map((event) => [event.id, event]));
  const latest = events.at(-1)?.revision ?? 0;
  const intervals = evolution.branches
    .map((branch) => {
      const related = events.filter((event) => event.branchId === branch.id);
      const open = branch.status === "planned" || branch.status === "exploring";
      return {
        branch,
        start: byId.get(branch.originEventId)?.revision ?? 0,
        end: open ? latest + 1 : Math.max(...related.map((event) => event.revision), 0),
      };
    })
    .sort((a, b) => a.start - b.start || a.branch.id.localeCompare(b.branch.id));
  const occupied: number[] = [Infinity];
  const lanes = new Map<string, number>();
  for (const interval of intervals) {
    let lane = 1;
    while (occupied[lane] !== undefined && occupied[lane] >= interval.start) lane++;
    occupied[lane] = interval.end;
    lanes.set(interval.branch.id, lane);
  }
  const nodes = events.map((event): EvolutionGraphNode => {
    const action = event.command?.action;
    const main = !event.branchId || ["create_branch", "adopt_result", "withdraw_adoption"].includes(event.kind);
    const marker =
      event.kind === "create_branch"
        ? "fork"
        : event.kind === "adopt_result"
          ? "merge"
          : event.kind === "withdraw_adoption"
            ? "withdrawn"
            : action?.type === "set_branch_status" && action.status === "paused"
              ? "paused"
              : action?.type === "set_branch_status" && action.status === "ended"
                ? "ended"
                : "event";
    return { event, main, branchId: event.branchId, lane: main ? 0 : (lanes.get(event.branchId!) ?? 0), marker };
  });
  const edges: EvolutionGraphEdge[] = [];
  const main = nodes.filter((node) => node.main);
  for (let i = 1; i < main.length; i++)
    edges.push({
      id: `main:${main[i].event.id}`,
      from: main[i - 1].event.id,
      to: main[i].event.id,
      lane: 0,
      kind: "main",
    });
  if (main.length && evolution.status !== "done")
    edges.push({ id: "main:head", from: main.at(-1)!.event.id, to: null, lane: 0, kind: "main" });
  for (const branch of evolution.branches) {
    if (!byId.has(branch.originEventId)) continue;
    const lane = lanes.get(branch.id)!;
    const commits = nodes.filter((node) => !node.main && node.branchId === branch.id);
    let previous = branch.originEventId;
    for (const [index, commit] of commits.entries()) {
      edges.push({
        id: `branch:${commit.event.id}`,
        from: previous,
        to: commit.event.id,
        branchId: branch.id,
        lane,
        kind: index === 0 ? "fork" : "branch",
      });
      previous = commit.event.id;
    }
    if (branch.status === "planned" || branch.status === "exploring") {
      edges.push({
        id: `head:${branch.id}`,
        from: previous,
        to: null,
        branchId: branch.id,
        lane,
        kind: commits.length ? "branch" : "fork",
      });
    }
  }
  for (const node of nodes) {
    const action = node.event.command?.action;
    // The immutable result version, not the branch's latest activity, is the merge parent.
    if (action?.type === "adopt_result" && byId.has(action.resultId))
      edges.push({
        id: `merge:${node.event.id}`,
        from: action.resultId,
        to: node.event.id,
        branchId: action.branchId,
        lane: lanes.get(action.branchId) ?? 0,
        kind: "merge",
        withdrawn: Boolean(evolution.adoptions.find((adoption) => adoption.id === node.event.id)?.withdrawnBy),
      });
  }
  return { nodes, edges, lanes, laneCount: Math.max(0, ...lanes.values()) + 1 };
}

const ordinaryEvents = new Set(["record_progress", "add_step", "set_step_done"]);
/** Collapsing hides labels, never the topology needed to connect surrounding nodes. */
export function buildEvolutionGraphRows(
  topology: EvolutionGraphTopology,
  showAll: boolean,
  expanded: ReadonlySet<string>,
): EvolutionGraphRow[] {
  const rows: EvolutionGraphRow[] = [];
  let hidden: string[] = [];
  const flush = () => {
    if (hidden.length) rows.push({ type: "gap", id: `gap:${hidden[0]}`, eventIds: hidden });
    hidden = [];
  };
  for (const node of topology.nodes) {
    if (!showAll && ordinaryEvents.has(node.event.kind) && !expanded.has(node.event.id)) hidden.push(node.event.id);
    else {
      flush();
      rows.push({ type: "event", id: node.event.id, node });
    }
  }
  flush();
  return rows.reverse();
}

export type EvolutionGraphPath = { edge: EvolutionGraphEdge; d: string; continuation: boolean };
/** Preserve hidden joints between key rows without spending a preview row on each gap. */
export function compactEvolutionRows(rows: EvolutionGraphRow[]): EvolutionGraphRow[] {
  const compact: EvolutionGraphRow[] = [];
  let hidden: string[] = [];
  for (const row of rows) {
    if (row.type === "gap") hidden.push(...row.eventIds);
    else {
      compact.push({ ...row, hiddenBefore: hidden });
      hidden = [];
    }
  }
  return compact;
}

export function projectEvolutionGraph(topology: EvolutionGraphTopology, allRows: EvolutionGraphRow[], limit: number) {
  const rows = allRows.slice(0, limit);
  const height = rows.length * EVOLUTION_ROW_HEIGHT;
  const width = EVOLUTION_GRAPH_INSET * 2 + (topology.laneCount - 1) * EVOLUTION_LANE_WIDTH;
  const position = new Map<string, { index: number; hidden: boolean }>();
  allRows.forEach((row, index) => {
    if (row.type === "event") {
      position.set(row.id, { index, hidden: false });
      row.hiddenBefore?.forEach((id) => position.set(id, { index: index - 0.5, hidden: true }));
    } else row.eventIds.forEach((id) => position.set(id, { index, hidden: true }));
  });
  const byId = new Map(topology.nodes.map((node) => [node.event.id, node]));
  const curve = line<[number, number]>().curve(curveBumpY);
  const x = (lane: number) => EVOLUTION_GRAPH_INSET + lane * EVOLUTION_LANE_WIDTH;
  const paths: EvolutionGraphPath[] = [];
  for (const edge of topology.edges) {
    const source = position.get(edge.from);
    const target = edge.to ? position.get(edge.to) : undefined;
    if (!source || (edge.to && !target)) continue;
    if (source.index >= rows.length && target && target.index >= rows.length) continue;
    if (target && source.index === target.index) continue;
    // Keep offscreen coordinates real. Clamping before routing would invent a
    // fork bend at the page boundary instead of clipping the actual old path.
    const sourceY = (source.index + 0.5) * EVOLUTION_ROW_HEIGHT;
    const targetY = target ? (target.index + 0.5) * EVOLUTION_ROW_HEIGHT : -12;
    const sourceX = x(edge.kind === "main" || edge.kind === "fork" ? (byId.get(edge.from)?.lane ?? 0) : edge.lane);
    const targetX = x(edge.kind === "main" || edge.kind === "merge" ? 0 : edge.lane);
    // A merge may use an older result, with newer branch commits in between.
    // Route beside the branch spine so it cannot appear to adopt those commits.
    const mergeX = sourceX + 8;
    const points: [number, number][] =
      edge.kind === "fork"
        ? [
            [sourceX, sourceY],
            [targetX, sourceY - EVOLUTION_ROW_HEIGHT / 2],
            [targetX, targetY],
          ]
        : edge.kind === "merge"
          ? [
              [sourceX, sourceY],
              [mergeX, sourceY - EVOLUTION_ROW_HEIGHT / 2],
              [mergeX, targetY + EVOLUTION_ROW_HEIGHT / 2],
              [targetX, targetY],
            ]
          : [
              [sourceX, sourceY],
              [targetX, targetY],
            ];
    const between = target ? allRows.slice(target.index, source.index + 1) : allRows.slice(0, source.index + 1);
    paths.push({
      edge,
      d: curve(points) ?? "",
      continuation: source.index >= rows.length || between.some((row) => row.type === "gap") || !target,
    });
  }
  return { rows, paths, width, height, remaining: Math.max(0, allRows.length - rows.length) };
}
