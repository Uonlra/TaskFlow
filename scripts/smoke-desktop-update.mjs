import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { access, mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import { createRequire } from "node:module";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, expect as baseExpect } from "@playwright/test";
import { parse, stringify } from "yaml";

assert.equal(process.platform, "win32");
const expect = baseExpect.configure({ timeout: 60_000 });
const require = createRequire(import.meta.url);
const pkg = JSON.parse(await readFile("package.json", "utf8"));
const resume = process.argv.find((arg) => arg.startsWith("--resume="))?.slice(9);
if (resume) assert.match(resume, /^\d+$/);
const id = resume ?? Date.now().toString();
const root = path.resolve(`dist/update-acceptance/run-${id}`);
const productName = `TaskFlow Update Check ${id}`;
const profile = path.join(process.env.APPDATA, productName);
const installDir = path.join(root, "installed");
const executable = path.join(installDir, "TaskFlowUpdateCheck.exe");
const versions = ["2.2.0-beta.1", "2.2.0-beta.2"];
const report = { root, profile, startedAt: new Date().toISOString(), steps: [], passed: false };
const record = (step) => {
  report.steps.push(step);
  console.log(`PASS: ${step}`);
};
const exists = async (file) =>
  access(file).then(
    () => true,
    () => false,
  );
await mkdir(root, { recursive: true });
async function run(command, args, env = process.env) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, stdio: "inherit", env });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${path.basename(command)} exited ${code}`)),
    );
  });
}
async function build(version) {
  const file = path.join(root, `builder-${version}.json`);
  const installer = path.join(root, version, `UpdateCheck-${version}.exe`);
  if (resume && !process.argv.includes("--rebuild")) {
    const config = JSON.parse(await readFile(file, "utf8"));
    assert.equal(config.appId, `top.uta4k.taskflow.updatecheck.${id}`);
    assert.equal(config.productName, productName);
    await access(installer);
    return installer;
  }
  const config = {
    ...pkg.build,
    appId: `top.uta4k.taskflow.updatecheck.${id}`,
    productName,
    executableName: "TaskFlowUpdateCheck",
    extraMetadata: {
      name: `taskflow-update-check-${id}`,
      productName,
      version,
      main: "scripts/fixtures/update-test-main.cjs",
      taskflowUpdateTest: { feed: `http://127.0.0.1:${feedPort}/`, port: String(debugPort) },
    },
    files: [...pkg.build.files, "scripts/fixtures/update-test-main.cjs"],
    directories: { output: path.join(root, version) },
    artifactName: "UpdateCheck-${version}.${ext}",
    electronDist: path.resolve(
      `dist/electron-cache/electron-v${pkg.devDependencies.electron.replace(/^[~^]/, "")}-win32-x64.zip`,
    ),
    nsis: { ...pkg.build.nsis, createDesktopShortcut: false, createStartMenuShortcut: false, runAfterFinish: false },
  };
  await writeFile(file, JSON.stringify(config, null, 2));
  await run(
    process.execPath,
    [require.resolve("electron-builder/cli.js"), "--win", "--x64", `--config=${file}`, "--publish", "never"],
    { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: "false" },
  );
  return installer;
}
let mode = "offline";
let metadata;
let feedServer;
let app;
let testEnv;
let debugPort;
let feedPort;
const reservations = [];
async function reservePort(port = 0) {
  const server = net.createServer((socket) => socket.destroy());
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  reservations.push(server);
  return server.address().port;
}
async function attach() {
  for (let attempt = 0; attempt < 240; attempt++) {
    let browser;
    try {
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${debugPort}`);
      const context = browser.contexts()[0];
      if (!context.pages().length) {
        await browser.close();
        await delay(500);
        continue;
      }
      const page = context.pages()[0];
      await page.waitForLoadState("domcontentloaded");
      await page.goto("app://taskflow/settings/");
      await expect(page.getByRole("region", { name: "应用更新", exact: true })).toBeVisible();
      return { browser, page };
    } catch {
      await browser?.close().catch(() => undefined);
      await delay(500);
    }
  }
  throw new Error("无法连接更新验收程序");
}
async function launch() {
  const child = spawn(executable, [`--remote-debugging-port=${debugPort}`], {
    windowsHide: true,
    stdio: "ignore",
    env: testEnv,
  });
  child.on("error", () => undefined);
  app = { ...(await attach()), child };
}
function nativeWindow() {
  const output = execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "@(Get-Process -Name TaskFlowUpdateCheck -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $env:TASKFLOW_CHECK_EXE -and $_.MainWindowHandle -ne 0 } | Select-Object Id,MainWindowTitle) | ConvertTo-Json -Compress",
    ],
    { env: { ...process.env, TASKFLOW_CHECK_EXE: executable }, encoding: "utf8", windowsHide: true },
  ).trim();
  if (!output) return null;
  const values = JSON.parse(output);
  const windows = Array.isArray(values) ? values : [values];
  assert.ok(!windows.some((window) => /^(Error|错误)$/.test(window.MainWindowTitle)), "升级后出现主进程错误窗口");
  return windows.find((window) => window.MainWindowTitle.startsWith("U's Task")) ?? null;
}
async function closeNativeWindow() {
  await run(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "Get-Process -Name TaskFlowUpdateCheck -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $env:TASKFLOW_CHECK_EXE -and $_.MainWindowHandle -ne 0 } | ForEach-Object { [void]$_.CloseMainWindow() }",
    ],
    { ...process.env, TASKFLOW_CHECK_EXE: executable },
  );
  await expect.poll(() => nativeWindow(), { timeout: 30_000 }).toBeNull();
  await delay(1000);
}
async function close() {
  if (!app) return;
  const current = app;
  app = null;
  const cdp = await current.browser.newBrowserCDPSession();
  void cdp.send("Browser.close").catch(() => undefined);
  await expect
    .poll(
      async () => {
        try {
          await fetch(`http://127.0.0.1:${debugPort}/json/version`);
          return false;
        } catch {
          return true;
        }
      },
      { timeout: 30_000 },
    )
    .toBe(true);
  await Promise.race([current.browser.close().catch(() => undefined), delay(1000)]);
  await delay(500);
}
const state = () => app.page.evaluate(() => window.taskflowDesktop.updates.getState());
const phase = (expected) => expect.poll(async () => (await state()).phase).toBe(expected);
async function verifyTask(id) {
  const result = await app.page.evaluate(async (taskId) => {
    const b = window.taskflowDesktop;
    return {
      task: await b.localTasks.get({ accountId: "update-smoke", taskId }),
      workspace: await b.workspace.get(),
      auth: await b.auth.get(),
      queue: await b.syncQueue.list({ accountId: "update-smoke" }),
    };
  }, id);
  assert.equal(result.task.description, "自动更新后保留");
  assert.equal(result.task.status, "done");
  assert.deepEqual(result.workspace, { accountId: "update-smoke", syncEnabled: false });
  assert.equal(result.auth.user.id, "update-smoke");
  assert.ok(result.queue.some((op) => op.taskId === id));
}
try {
  if (resume && (await exists(profile))) {
    const previous = `${profile}.previous-${Date.now()}`;
    assert.equal(path.dirname(path.resolve(profile)), path.resolve(process.env.APPDATA));
    assert.equal(path.dirname(path.resolve(previous)), path.resolve(process.env.APPDATA));
    assert.equal(await exists(previous), false);
    await rename(profile, previous);
    report.previousProfile = previous;
  }
  // Chromium can recreate shader cache directories while a previous GPU
  // process exits. Require clean application data instead of an absent folder.
  for (const file of ["taskflow.sqlite", "taskflow.sqlite.key", "taskflow.auth"]) {
    assert.equal(await exists(path.join(profile, file)), false, `旧验收数据尚未隔离：${file}`);
  }
  if (resume && !process.argv.includes("--rebuild")) {
    const config = JSON.parse(await readFile(path.join(root, `builder-${versions[0]}.json`), "utf8"));
    assert.ok(config.extraMetadata.taskflowUpdateTest, "旧验收包需要 --rebuild");
    feedPort = await reservePort(Number(new URL(config.extraMetadata.taskflowUpdateTest.feed).port));
    debugPort = await reservePort(Number(config.extraMetadata.taskflowUpdateTest.port));
  } else {
    feedPort = await reservePort();
    debugPort = await reservePort();
  }
  const first = await build(versions[0]);
  await build(versions[1]);
  metadata = parse(await readFile(path.join(root, versions[1], "beta.yml"), "utf8"));
  const files = new Map();
  for (const version of versions)
    for (const name of await readdir(path.join(root, version))) {
      if (name.endsWith(".exe") || name.endsWith(".blockmap")) files.set(name, path.join(root, version, name));
    }
  feedServer = http.createServer(async (req, res) => {
    try {
      const name = decodeURIComponent(new URL(req.url, "http://localhost").pathname).slice(1);
      if (mode === "offline") {
        res.writeHead(503).end();
        return;
      }
      if (name === "beta.yml") {
        const data = structuredClone(metadata);
        if (mode === "downgrade") data.version = "2.1.0";
        if (mode === "corrupt") {
          data.sha512 = Buffer.alloc(64).toString("base64");
          data.files[0].sha512 = data.sha512;
        }
        res.writeHead(200, { "Content-Type": "text/yaml" }).end(stringify(data));
        return;
      }
      const file = files.get(name);
      if (!file) {
        res.writeHead(404).end();
        return;
      }
      const size = (await stat(file)).size;
      const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? "");
      if (range) {
        const start = Number(range[1]),
          end = range[2] ? Number(range[2]) : size - 1;
        if (start > end || end >= size) {
          res.writeHead(416).end();
          return;
        }
        res.writeHead(206, {
          "Content-Length": end - start + 1,
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Accept-Ranges": "bytes",
        });
        createReadStream(file, { start, end }).pipe(res);
      } else {
        res.writeHead(200, { "Content-Length": size, "Accept-Ranges": "bytes" });
        createReadStream(file).pipe(res);
      }
    } catch {
      res.writeHead(500).end();
    }
  });
  for (const server of reservations.splice(0)) await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve) => feedServer.listen(feedPort, "127.0.0.1", resolve));
  testEnv = {
    ...process.env,
    TASKFLOW_DISABLE_UPDATE_CHECK: "1",
    ELECTRON_START_URL: "app://taskflow/settings/",
    TASKFLOW_WEB_URL: "app://taskflow/settings/",
  };
  await run(first, ["/S", "/currentuser", `/D=${installDir}`], testEnv);
  await launch();
  assert.equal((await state()).currentVersion, versions[0]);
  const task = await app.page.evaluate(async () => {
    const b = window.taskflowDesktop;
    const task = await b.localTasks.create({
      accountId: "local:device",
      task: {
        title: "自动更新验收任务",
        description: "自动更新后保留",
        status: "done",
        priority: "high",
        tags: "更新验收",
        dueDate: "",
      },
    });
    await b.auth.set({ user: { id: "update-smoke" }, profile: { id: "update-smoke" }, session: null });
    await b.workspace.connect();
    await b.workspace.pause();
    return task;
  });
  await app.page.getByRole("button", { name: "检查更新", exact: true }).click();
  await phase("error");
  record("更新服务不可用不影响本地工作区，可重试");
  mode = "downgrade";
  await app.page.getByRole("button", { name: "检查更新", exact: true }).click();
  await phase("not-available");
  record("真实更新器拒绝低版本降级");
  mode = "corrupt";
  await app.page.getByRole("button", { name: "检查更新", exact: true }).click();
  await phase("available");
  await app.page.getByRole("button", { name: "下载更新", exact: true }).click();
  await phase("error");
  assert.equal((await state()).currentVersion, versions[0]);
  await assert.rejects(() => app.page.evaluate(() => window.taskflowDesktop.updates.install()));
  record("SHA-512 校验失败无法安装更新");
  mode = "valid";
  await app.page.getByRole("button", { name: "检查更新", exact: true }).click();
  await phase("available");
  await app.page.getByRole("button", { name: "下载更新", exact: true }).click();
  await phase("downloaded");
  await app.page.evaluate(() => window.taskflowDesktop.updates.check());
  await phase("downloaded");
  await close();
  await launch();
  assert.equal((await state()).currentVersion, versions[0]);
  await verifyTask(task.id);
  record("下载后普通退出不安装，重启仍是旧版且数据完整");
  await app.page.getByRole("button", { name: "检查更新", exact: true }).click();
  await phase("available");
  await app.page.getByRole("button", { name: "下载更新", exact: true }).click();
  await phase("downloaded");
  await app.page.getByRole("button", { name: "重启并安装", exact: true }).click();
  await expect(app.page.getByRole("alertdialog")).toBeVisible();
  await app.page
    .getByRole("button", { name: "确认重启安装", exact: true })
    .click()
    .catch(() => undefined);
  await app.browser.close().catch(() => undefined);
  app = null;
  // NSIS relaunch is observed through its actual window. Its shell launch can
  // omit the debugging listener; reopen with an explicit CLI switch to inspect
  // encrypted storage, rather than confusing test transport with app failure.
  await expect.poll(() => Boolean(nativeWindow()), { timeout: 90_000 }).toBe(true);
  record("NSIS 自动重启后出现正常应用窗口，无主进程错误对话框");
  await closeNativeWindow();
  await launch();
  await expect.poll(async () => (await state()).currentVersion).toBe(versions[1]);
  await verifyTask(task.id);
  record("确认后完成真实 NSIS 下载、升级及自动重启，任务、身份、工作区和队列保留");
  await close();
  const uninstaller = (await readdir(installDir)).find((name) => /^Uninstall .*\.exe$/.test(name));
  assert.ok(uninstaller);
  const target = path.resolve(installDir, uninstaller);
  assert.ok(target.startsWith(`${root}${path.sep}`));
  await run(target, ["/S", "/currentuser"]);
  await expect.poll(() => exists(executable)).toBe(false);
  report.passed = true;
} catch (error) {
  report.error = error.stack ?? String(error);
  process.exitCode = 1;
  console.error(error.message);
} finally {
  for (const server of reservations.splice(0)) await new Promise((resolve) => server.close(resolve));
  await close().catch(() => undefined);
  feedServer?.closeAllConnections();
  if (feedServer) await new Promise((resolve) => feedServer.close(resolve));
  report.finishedAt = new Date().toISOString();
  await writeFile(path.join(root, "report.json"), JSON.stringify(report, null, 2));
  console.log(`更新验收报告：${path.join(root, "report.json")}`);
}
