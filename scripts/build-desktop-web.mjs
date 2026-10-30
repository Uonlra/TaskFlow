import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

try {
  process.loadEnvFile(fileURLToPath(new URL("../.env.local", import.meta.url)));
} catch {
  // Local env files are optional for the static shell build.
}

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const desktopRoot = fileURLToPath(new URL("../desktop-web/", import.meta.url));
await Promise.all([
  rm(`${desktopRoot}.next`, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }),
  rm(`${desktopRoot}out`, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }),
]);

const child = spawn(command, ["exec", "next", "build", "desktop-web", "--webpack"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    TASKFLOW_DESKTOP_BUILD: "1",
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || "https://www.uta4k.top",
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  }

  process.exit(code ?? 1);
});
