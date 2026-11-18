import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { createRequire } from "node:module";
import path from "node:path";
import { build } from "esbuild";

const root = path.resolve("test-results/evolution-performance");
await mkdir(root, { recursive: true });
await build({
  stdin: {
    contents: `export {longHistoryFixture} from './test/fixtures/task-evolution-long-history'; export {parseTaskEvolution,executeTaskEvolution,MAX_EVOLUTION_BYTES} from './src/features/tasks/domain/task-evolution-storage'; export {buildEvolutionGraph,buildEvolutionGraphRows,projectEvolutionGraph} from './src/features/tasks/utils/task-evolution-graph'; export {TaskEvolutionGraph} from './src/features/tasks/components/task-evolution-graph'; export {createTaskExportPayload} from './src/features/tasks/utils/task-transfer';`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: path.join(root, "runtime.cjs"),
  external: ["react", "react/*", "react-dom", "react-dom/*", "next/*"],
});
process.env.NODE_ENV = "production";
const require = createRequire(import.meta.url);
const { createElement } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const runtime = require(path.join(root, "runtime.cjs"));
const bytes = (state) => Buffer.byteLength(JSON.stringify(state));
function measure(run, samples = 3) {
  run();
  const timings = [];
  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    run();
    timings.push(performance.now() - start);
  }
  timings.sort((a, b) => a - b);
  return { medianMs: +timings[Math.floor(timings.length / 2)].toFixed(2), maxMs: +timings.at(-1).toFixed(2) };
}
const results = [];
for (const [events, branches] of [
  [30, 3],
  [300, 10],
  [1000, 30],
]) {
  const task = runtime.longHistoryFixture(events, branches);
  const json = JSON.stringify(task.evolution);
  const read = measure(() => runtime.parseTaskEvolution(JSON.parse(json), task.id));
  const graph = measure(() => {
    const topology = runtime.buildEvolutionGraph(task.evolution);
    return runtime.projectEvolutionGraph(topology, runtime.buildEvolutionGraphRows(topology, false, new Set()), 30);
  });
  const render = measure(() =>
    renderToStaticMarkup(createElement(runtime.TaskEvolutionGraph, { evolution: task.evolution })),
  );
  const backup = runtime.createTaskExportPayload([task]);
  await writeFile(path.join(root, `history-${events}.json`), JSON.stringify(backup));
  results.push({
    events,
    branches,
    snapshotBytes: bytes(task.evolution),
    read,
    graph,
    render,
    backupBytes: bytes(backup),
  });
  console.log(JSON.stringify(results.at(-1)));
}
let near = runtime.longHistoryFixture(30, 3);
while (true) {
  let candidate;
  try {
    candidate = runtime.executeTaskEvolution(
      near,
      {
        operationId: `capacity-${near.evolution.revision}`,
        expectedRevision: near.evolution.revision,
        action: { type: "record_progress", note: "容".repeat(10000) },
      },
      "2026-11-18T00:00:00.000Z",
    );
  } catch (error) {
    if (/存储容量/.test(error.message)) break;
    throw error;
  }
  near = candidate;
}
const before = JSON.stringify(near);
assert.throws(
  () =>
    runtime.executeTaskEvolution(
      near,
      {
        operationId: "capacity-overflow",
        expectedRevision: near.evolution.revision,
        action: { type: "record_progress", note: "容".repeat(10000) },
      },
      "2026-11-18T00:00:00.000Z",
    ),
  /存储容量/,
);
assert.equal(JSON.stringify(near), before);
const backup = runtime.createTaskExportPayload([near]);
await writeFile(path.join(root, "near-capacity.json"), JSON.stringify(backup));
const report = {
  measuredAt: new Date().toISOString(),
  runtime: process.version,
  samples: 3,
  results,
  capacity: { snapshotBytes: bytes(near.evolution), backupBytes: bytes(backup), rejectedOverflowWithoutMutation: true },
};
await writeFile(
  path.join(root, process.argv.includes("--baseline") ? "baseline.json" : "report.json"),
  JSON.stringify(report, null, 2),
);
console.log(`性能报告：${root}`);
