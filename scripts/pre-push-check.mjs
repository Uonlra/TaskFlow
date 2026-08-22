import { spawnSync } from "node:child_process";

const packageManager = process.env.npm_execpath;
const packageManagerCommand = packageManager ? process.execPath : process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const checks = [
  ["Lint", "lint"],
  ["Format", "format:check"],
  ["Unit and component tests", "test"],
  ["Typecheck", "typecheck"],
  ["Build", "build"],
  ["Mock E2E tests", "test:e2e:mock"],
];

for (const [label, script] of checks) {
  console.log(`\n==> ${label} (pnpm ${script})`);
  const packageManagerArgs = packageManager ? [packageManager, "run", script] : ["run", script];
  const result = spawnSync(packageManagerCommand, packageManagerArgs, {
    stdio: "inherit",
    shell: false,
    env: process.env,
  });

  if (result.error) {
    console.error(`\n${label} could not be started: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`\nPre-push validation stopped after ${label}.`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nAll pre-push checks passed.");
