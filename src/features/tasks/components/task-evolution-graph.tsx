"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, ChevronsDown, GitBranch, List, ListFilter, X } from "lucide-react";
import type { TaskEvolution } from "@/features/tasks/types/task-evolution.types";
import {
  buildEvolutionGraph,
  buildEvolutionGraphRows,
  compactEvolutionRows,
  projectEvolutionGraph,
  EVOLUTION_ROW_HEIGHT,
  EVOLUTION_LANE_WIDTH,
  EVOLUTION_GRAPH_INSET,
  EVOLUTION_PAGE_SIZE,
} from "@/features/tasks/utils/task-evolution-graph";
import { describeEvolutionEvent } from "@/features/tasks/utils/task-evolution-presentation";
import { TaskEvolutionEventDetails } from "./task-evolution-event-details";
import { formatDateTime } from "./task-detail-sections";
import { buildTaskEvolutionHref } from "@/features/tasks/utils/task-evolution-navigation";

function branchColor(evolution: TaskEvolution, branchId?: string) {
  if (!branchId) return "var(--primary)";
  const index = Math.max(
    0,
    evolution.branches.findIndex((branch) => branch.id === branchId),
  );
  return `var(--evolution-branch-${index % 4})`;
}

type TaskEvolutionGraphProps = {
  evolution: TaskEvolution;
  compact?: boolean;
  onSelectBranch?: (branchId: string) => void;
  onWithdraw?: (adoptionId: string) => void;
  actionsDisabled?: boolean;
  initialEventId?: string;
};

export function TaskEvolutionGraph(props: TaskEvolutionGraphProps) {
  return <TaskEvolutionGraphView key={props.evolution.taskId} {...props} />;
}

function TaskEvolutionGraphView({
  evolution,
  compact = false,
  onSelectBranch,
  onWithdraw,
  actionsDisabled = false,
  initialEventId,
}: TaskEvolutionGraphProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialEventId ?? null);
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(initialEventId ? [initialEventId] : []));
  const [limit, setLimit] = useState(compact ? 5 : EVOLUTION_PAGE_SIZE);
  const [focusedBranch, setFocusedBranch] = useState("");
  const [hoveredBranch, setHoveredBranch] = useState<string | undefined>();
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const headingId = useId();
  const inspectorId = useId();
  const inspectorHeadingRef = useRef<HTMLHeadingElement>(null);
  const topology = useMemo(() => buildEvolutionGraph(evolution), [evolution]);
  const allRows = useMemo(() => {
    const rows = buildEvolutionGraphRows(topology, showAll, expanded);
    return compact ? compactEvolutionRows(rows) : rows;
  }, [topology, showAll, expanded, compact]);
  // Keep a selected old node reachable when changing the collapse mode.
  const selectedRow = allRows.findIndex((row) => row.type === "event" && row.id === selectedId);
  const visibleLimit = Math.max(limit, selectedRow + 1);
  const graph = useMemo(
    () => projectEvolutionGraph(topology, allRows, visibleLimit),
    [topology, allRows, visibleLimit],
  );
  const selected = topology.nodes.find((node) => node.event.id === selectedId);
  const selectedDetails = selected ? describeEvolutionEvent(evolution, selected.event) : undefined;
  useEffect(() => {
    if (!initialEventId) return;
    const frame = requestAnimationFrame(() => {
      rowRefs.current.get(initialEventId)?.focus();
      rowRefs.current.get(initialEventId)?.scrollIntoView({ block: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [initialEventId]);
  const highlighted = hoveredBranch ?? focusedBranch;
  const dim = (branchId?: string) => Boolean(highlighted && branchId && branchId !== highlighted);

  function closeInspector() {
    setLimit(visibleLimit);
    setSelectedId(null);
    if (selectedId) rowRefs.current.get(selectedId)?.focus();
  }

  function selectEvent(id: string) {
    if (id === selectedId) {
      closeInspector();
      return;
    }
    setLimit(visibleLimit);
    setExpanded((ids) => new Set([...ids, id]));
    setSelectedId(id);
    requestAnimationFrame(() => rowRefs.current.get(id)?.scrollIntoView({ block: "nearest" }));
  }
  function locateEvent(id: string) {
    const rowIndex = allRows.findIndex((row) => (row.type === "event" ? row.id === id : row.eventIds.includes(id)));
    if (rowIndex < 0) return;
    setExpanded((ids) => new Set([...ids, id]));
    setLimit((current) => Math.max(current, rowIndex + EVOLUTION_PAGE_SIZE));
    setSelectedId(id);
    requestAnimationFrame(() => {
      const row = rowRefs.current.get(id);
      row?.focus();
      row?.scrollIntoView({ block: "nearest" });
    });
  }
  function rowKeyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowDown") next++;
    else if (event.key === "ArrowUp") next--;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = graph.rows.length - 1;
    else if (event.key === "ArrowRight" && graph.rows[index].type === "event") {
      event.preventDefault();
      const id = graph.rows[index].id;
      setLimit(visibleLimit);
      setExpanded((ids) => new Set([...ids, id]));
      setSelectedId(id);
      requestAnimationFrame(() => inspectorHeadingRef.current?.focus());
      return;
    } else if (event.key === "Escape") {
      closeInspector();
      return;
    } else return;
    event.preventDefault();
    rowRefs.current.get(graph.rows[Math.max(0, Math.min(next, graph.rows.length - 1))].id)?.focus();
  }

  return (
    <section className={`task-evolution-graph${compact ? " is-compact" : ""}`} aria-labelledby={headingId}>
      <header className="task-evolution-graph-heading">
        <div className="task-evolution-graph-title">
          <h2 id={headingId}>演进记录</h2>
          <span className="task-evolution-graph-count">
            {evolution.events.length}
            <span className="visually-hidden"> 条记录</span>
          </span>
        </div>
        <div className="task-evolution-graph-toolbar">
          {evolution.branches.length ? (
            <label title="突出分支">
              <GitBranch size={14} aria-hidden="true" />
              <select
                aria-label="突出分支"
                value={focusedBranch}
                onChange={(event) => setFocusedBranch(event.target.value)}
              >
                <option value="">全部分支</option>
                {evolution.branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            type="button"
            className="task-evolution-graph-icon-button"
            aria-label={showAll ? "只看关键记录" : `查看全部 ${evolution.events.length} 条记录`}
            title={showAll ? "只看关键记录" : "查看全部记录"}
            aria-pressed={showAll}
            onClick={() => setShowAll((value) => !value)}
          >
            {showAll ? <List size={16} aria-hidden="true" /> : <ListFilter size={16} aria-hidden="true" />}
          </button>
        </div>
      </header>
      <div
        className="task-evolution-graph-scroll"
        role="group"
        tabIndex={0}
        aria-label="任务演进图与记录"
        data-lenis-prevent-wheel="true"
      >
        <div
          className="task-evolution-graph-table"
          style={
            { "--graph-width": `${graph.width}px`, "--graph-row-height": `${EVOLUTION_ROW_HEIGHT}px` } as CSSProperties
          }
        >
          <svg
            className="task-evolution-graph-svg"
            width={graph.width}
            height={graph.height}
            viewBox={`0 0 ${graph.width} ${graph.height}`}
            aria-hidden="true"
            focusable="false"
          >
            {graph.paths.map(({ edge, d, continuation }) => (
              <path
                key={edge.id}
                d={d}
                fill="none"
                stroke={branchColor(evolution, edge.branchId)}
                strokeWidth={
                  edge.to === selectedId || edge.from === selectedId
                    ? 2.8
                    : highlighted && edge.branchId === highlighted
                      ? 2.5
                      : 1.6
                }
                strokeDasharray={edge.withdrawn ? "2 4" : continuation ? "4 3" : undefined}
                opacity={
                  edge.to === selectedId || edge.from === selectedId
                    ? 1
                    : dim(edge.branchId)
                      ? 0.18
                      : edge.withdrawn
                        ? 0.45
                        : 0.82
                }
                data-edge-kind={edge.kind}
                data-source-event={edge.from}
                data-target-event={edge.to ?? "continuing"}
              />
            ))}
            {graph.rows.map((row, index) => {
              if (row.type !== "event") return null;
              const node = row.node;
              const x = EVOLUTION_GRAPH_INSET + node.lane * EVOLUTION_LANE_WIDTH;
              const y = (index + 0.5) * EVOLUTION_ROW_HEIGHT;
              const color = node.main ? "var(--primary)" : branchColor(evolution, node.branchId);
              const selectedNode = node.event.id === selectedId;
              return (
                <g key={row.id} opacity={dim(node.branchId) ? 0.3 : 1} data-event-node={row.id}>
                  {selectedNode ? (
                    <circle cx={x} cy={y} r={11} fill="var(--surface-strong)" stroke={color} strokeWidth={1} />
                  ) : null}
                  {node.marker === "merge" ? (
                    <circle cx={x} cy={y} r={7} fill="var(--surface-strong)" stroke={color} strokeWidth={1.8} />
                  ) : null}
                  <circle
                    cx={x}
                    cy={y}
                    r={node.marker === "merge" ? 3.5 : 4.5}
                    fill={node.marker === "paused" || node.marker === "ended" ? "var(--surface-strong)" : color}
                    stroke={color}
                    strokeWidth={1.6}
                  />
                  {node.marker === "paused" ? (
                    <path d={`M${x - 1.5},${y - 2}v4 M${x + 1.5},${y - 2}v4`} stroke={color} strokeWidth={1} />
                  ) : null}
                  {node.marker === "ended" ? <path d={`M${x - 2},${y}h4`} stroke={color} strokeWidth={1} /> : null}
                  {node.marker === "withdrawn" ? (
                    <path
                      d={`M${x - 2},${y - 2}l4,4 M${x - 2},${y + 2}l4,-4`}
                      stroke="var(--surface-strong)"
                      strokeWidth={1}
                    />
                  ) : null}
                </g>
              );
            })}
          </svg>
          <ol className="task-evolution-graph-rows">
            {graph.rows.map((row, index) => {
              if (row.type === "gap")
                return (
                  <li key={row.id} className="task-evolution-graph-row is-gap">
                    <button
                      type="button"
                      aria-label={`展开 ${row.eventIds.length} 条进展与步骤记录`}
                      ref={(element) => {
                        if (element) rowRefs.current.set(row.id, element);
                        else rowRefs.current.delete(row.id);
                      }}
                      onKeyDown={(event) => rowKeyboard(event, index)}
                      onClick={() => setExpanded((ids) => new Set([...ids, ...row.eventIds]))}
                    >
                      <span className="task-evolution-graph-gap">
                        <ChevronDown size={14} aria-hidden="true" />
                        {row.eventIds.length} 条记录
                      </span>
                    </button>
                  </li>
                );
              const { node } = row;
              const { label, detail, branch, adoption } = describeEvolutionEvent(evolution, node.event);
              const source = node.main
                ? node.marker === "merge"
                  ? `主线 · 成果汇入${branch ? ` · ${branch.title}` : ""}`
                  : "主线"
                : (branch?.title ?? "探索分支");
              return (
                <li
                  key={row.id}
                  className={`task-evolution-graph-row${selectedId === row.id ? " is-selected" : ""}${dim(node.branchId) ? " is-dimmed" : ""}`}
                  style={
                    { "--node-color": branchColor(evolution, node.main ? undefined : node.branchId) } as CSSProperties
                  }
                >
                  <button
                    type="button"
                    aria-label={`${label} ${source}${detail ? ` · ${detail}` : ""}${adoption?.withdrawnBy ? " · 已撤回" : ""} ${formatDateTime(node.event.occurredAt)}`}
                    aria-expanded={selectedId === row.id}
                    aria-controls={selectedId === row.id ? inspectorId : undefined}
                    title={`${label} · ${source}${detail ? ` · ${detail}` : ""}`}
                    ref={(element) => {
                      if (element) rowRefs.current.set(row.id, element);
                      else rowRefs.current.delete(row.id);
                    }}
                    onClick={() => selectEvent(row.id)}
                    onKeyDown={(event) => rowKeyboard(event, index)}
                    onMouseEnter={() => setHoveredBranch(node.branchId)}
                    onMouseLeave={() => setHoveredBranch(undefined)}
                  >
                    <span aria-hidden="true" className={`task-evolution-graph-mobile-marker is-${node.marker}`}>
                      {node.marker === "merge"
                        ? "◎"
                        : node.marker === "paused"
                          ? "Ⅱ"
                          : node.marker === "ended"
                            ? "−"
                            : node.marker === "withdrawn"
                              ? "×"
                              : "●"}
                    </span>
                    <span className="task-evolution-graph-copy">
                      <strong>
                        {label}
                        {detail ? ` · ${detail}` : ""}
                        {adoption?.withdrawnBy ? <small> · 已撤回</small> : null}
                      </strong>
                      <span>
                        {node.marker === "merge" && branch ? (
                          <>
                            {branch.title}
                            <ArrowRight size={11} aria-hidden="true" />
                            主线
                          </>
                        ) : (
                          source
                        )}
                      </span>
                    </span>
                    <time dateTime={node.event.occurredAt}>{formatDateTime(node.event.occurredAt)}</time>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      {graph.remaining ? (
        <div className="task-evolution-graph-footer">
          <button
            type="button"
            aria-label={`加载更早记录（还有 ${graph.remaining} 行）`}
            onClick={() => {
              const nextRow = allRows[graph.rows.length]?.id;
              setLimit(visibleLimit + EVOLUTION_PAGE_SIZE);
              requestAnimationFrame(() => {
                if (nextRow) {
                  rowRefs.current.get(nextRow)?.focus();
                  rowRefs.current.get(nextRow)?.scrollIntoView({ block: "nearest" });
                }
              });
            }}
          >
            <ChevronsDown size={14} aria-hidden="true" />
            更早记录
          </button>
        </div>
      ) : null}
      {selected && selectedDetails ? (
        <section
          className="task-evolution-graph-inspector"
          id={inspectorId}
          aria-label="节点详情"
          aria-live="polite"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              closeInspector();
            }
          }}
        >
          <header>
            <h3 ref={inspectorHeadingRef} tabIndex={-1}>
              {selectedDetails.label}
            </h3>
            <button
              type="button"
              className="task-evolution-graph-icon-button"
              onClick={closeInspector}
              aria-label="关闭节点详情"
              title="关闭"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </header>
          <time dateTime={selected.event.occurredAt}>{formatDateTime(selected.event.occurredAt)}</time>
          <TaskEvolutionEventDetails evolution={evolution} event={selected.event} />
          <div className="task-evolution-actions">
            {compact ? (
              <Link
                href={buildTaskEvolutionHref(evolution.taskId, {
                  eventId: selected.event.id,
                  branchId: selected.event.branchId,
                })}
              >
                在详情中查看
              </Link>
            ) : null}
            {selected.event.command?.action.type === "withdraw_adoption" ? (
              <button
                type="button"
                onClick={() => {
                  const action = selected.event.command!.action;
                  if (action.type === "withdraw_adoption") locateEvent(action.adoptionId);
                }}
              >
                定位原采纳
              </button>
            ) : null}
            {selected.event.command?.action.type === "adopt_result" ? (
              <button
                type="button"
                onClick={() => {
                  const action = selected.event.command!.action;
                  if (action.type === "adopt_result") locateEvent(action.resultId);
                }}
              >
                定位来源结论
              </button>
            ) : null}
            {selectedDetails.branch && onSelectBranch ? (
              <button
                type="button"
                disabled={actionsDisabled}
                onClick={() => onSelectBranch(selectedDetails.branch!.id)}
              >
                查看来源分支
              </button>
            ) : null}
            {selectedDetails.adoption &&
            !selectedDetails.adoption.withdrawnBy &&
            evolution.status !== "done" &&
            onWithdraw ? (
              <button type="button" disabled={actionsDisabled} onClick={() => onWithdraw(selectedDetails.adoption!.id)}>
                撤回此次采纳
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
    </section>
  );
}
