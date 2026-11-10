import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const profile = path.join(root, "dist", "preview-profile");
const env = {
  ...process.env,
  ELECTRON_START_URL: "app://taskflow/",
  TASKFLOW_CONTROLS_TEST_PROFILE: profile,
  TASKFLOW_DISABLE_UPDATE_CHECK: "1",
};
delete env.ELECTRON_RUN_AS_NODE;

function run(executable, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd: root, env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`预览进程退出：${code ?? signal}`));
    });
  });
}

try {
  if (process.platform !== "win32") throw new Error("当前桌面预览脚本仅支持 Windows。");
  if (process.argv.includes("--rebuild") || !existsSync(path.join(root, "desktop-web/out/index.html"))) {
    console.log("正在构建桌面界面…");
    await run(process.execPath, [path.join(root, "scripts/build-desktop-web.mjs")]);
  }
  // Reuse the local runtime when the package's Electron binary hasn't been downloaded.
  const localRuntime = path.join(root, "dist/tray-electron-runtime/electron.exe");
  const executable = existsSync(localRuntime) ? localRuntime : require("electron");
  await mkdir(profile, { recursive: true });
  console.log("正在打开 TaskFlow 桌面预览，数据保存在 dist/preview-profile。");
  await run(executable, [path.join(root, "scripts/fixtures/desktop-controls-test-main.cjs")]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
