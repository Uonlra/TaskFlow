import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, cp, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, expect as baseExpect } from "@playwright/test";

assert.equal(process.platform, "win32");
const require = createRequire(import.meta.url);
const builderRequire = createRequire(require.resolve("electron-builder/package.json"));
const libRequire = createRequire(builderRequire.resolve("app-builder-lib/package.json"));
const asar = libRequire("@electron/asar");
const seven = await libRequire("./out/toolsets/7zip.js").getPath7za();
const pkg = JSON.parse(await readFile("package.json", "utf8"));
const args = process.argv.slice(2);
const positional = args.filter((arg) => !arg.startsWith("--"));
const resumeId = args.find((arg) => arg.startsWith("--resume="))?.slice("--resume=".length);
if (resumeId) assert.match(resumeId, /^\d+$/, "恢复参数只能是已有验收的时间戳");
const candidate = path.resolve(positional[0] ?? `dist/candidates/v${pkg.version}`);
const oldInstaller = path.resolve(
  positional[1] ?? "dist/github-beta2-run-42224896411/files/TaskFlow-Setup-2.2.0-beta.2-win-x64.exe",
);
const oldSha = "e2053666de4d5d9b923fa87198df10868821133a499c74c8b35edd9f88aa5fd3";
const id = resumeId ?? Date.now().toString();
const root = path.resolve(`dist/manual-upgrade-acceptance/run-${id}`);
const installDir = path.join(root, "installed");
const profile = path.join(root, "profile");
const executable = path.join(installDir, "TaskFlowManualCheck.exe");
const productName = `TaskFlow Manual Check ${id}`;
const accountId = "manual-upgrade-check";
const expect = baseExpect.configure({ timeout: 20_000 });
const report = {
  candidate,
  oldInstaller,
  oldSha,
  root,
  profile,
  version: pkg.version,
  startedAt: new Date().toISOString(),
  steps: [],
  passed: false,
};
await mkdir(root, { recursive: true });
const record = (name, details) => {
  report.steps.push({ name, ...(details ? { details } : {}) });
  console.log(`PASS: ${name}`);
};
const exists = (file) =>
  access(file).then(
    () => true,
    () => false,
  );
async function digest(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
async function run(command, args, capture = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
      env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: "false" },
    });
    let output = "";
    if (capture) {
      child.stdout.on("data", (data) => {
        output += data;
      });
      child.stderr.on("data", (data) => {
        output += data;
      });
    }
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? resolve(output)
        : reject(new Error(`${path.basename(command)} exited ${code}: ${output.slice(-2000)}`)),
    );
  });
}
async function prepareRuntime(source, destination, version) {
  assert.ok(destination.startsWith(root + path.sep));
  const archive = path.join(source, "resources/app.asar");
  const bundled = JSON.parse(asar.extractFile(archive, "package.json").toString());
  assert.equal(bundled.version, version);
  // Prepackaged input preserves the complete runtime, dependency tree and ASAR integrity.
  if (!resumeId) {
    await cp(source, destination, { recursive: true });
    await rename(path.join(destination, "TaskFlow.exe"), path.join(destination, "TaskFlowManualCheck.exe"));
  }
  assert.equal(await digest(path.join(destination, "resources/app.asar")), await digest(archive));
  report[version] = {
    archiveSha256: await digest(archive),
  };
  return destination;
}
async function buildIsolated(runtime, version) {
  const output = path.join(root, version);
  const config = {
    appId: `top.uta4k.taskflow.manualcheck.${id}`,
    productName,
    executableName: "TaskFlowManualCheck",
    extraMetadata: { name: `taskflow-manual-check-${id}`, productName, version },
    directories: { output },
    npmRebuild: false,
    asar: true,
    electronVersion: pkg.devDependencies.electron.replace(/^[~^]/, ""),
    electronDist: path.resolve(
      `dist/electron-cache/electron-v${pkg.devDependencies.electron.replace(/^[~^]/, "")}-win32-x64.zip`,
    ),
    artifactName: "ManualCheck-" + version + ".${ext}",
    win: { target: [{ target: "nsis", arch: ["x64"] }] },
    nsis: { ...pkg.build.nsis, createDesktopShortcut: false, createStartMenuShortcut: false, runAfterFinish: false },
    publish: null,
  };
  const file = path.join(root, `builder-${version}.json`);
  const installer = path.join(output, `ManualCheck-${version}.exe`);
  if (resumeId) {
    assert.deepEqual(JSON.parse(await readFile(file, "utf8")), config);
    await access(installer);
    return installer;
  }
  await writeFile(file, JSON.stringify(config, null, 2));
  await run(process.execPath, [
    require.resolve("electron-builder/cli.js"),
    `--prepackaged=${runtime}`,
    "--win",
    "--x64",
    `--config=${file}`,
    "--publish",
    "never",
  ]);
  return installer;
}
async function install(installer, version) {
  assert.ok(installDir.startsWith(root + path.sep));
  await run(installer, ["/S", "/currentuser", `/D=${installDir}`]);
  await expect.poll(() => exists(executable)).toBe(true);
  const resource = await run(
    "powershell.exe",
    ["-NoProfile", "-Command", `(Get-Item -LiteralPath '${executable.replaceAll("'", "''")}').VersionInfo.FileVersion`],
    true,
  );
  assert.equal(resource.trim(), version, "安装版本资源不匹配");
  assert.equal(await digest(path.join(installDir, "resources/app.asar")), report[version].archiveSha256);
}
let app;
let phase = "old";
let fail = false;
let attempts = [];
const cloud = new Map();
const auth = {
  user: { id: accountId, email: "manual-upgrade@example.invalid", name: "升级验收", emailVerified: true },
  profile: { id: accountId, email: "manual-upgrade@example.invalid", fullName: "升级验收" },
  session: { expire: "2099-01-01T00:00:00Z" },
};
async function mockCloud(route) {
  const request = route.request();
  const url = new URL(request.url());
  attempts.push(`${request.method()} ${url.pathname}`);
  if (phase !== "manual" || fail) return route.fulfill({ status: 503, json: { message: "模拟云端暂停" } });
  if (url.pathname !== "/api/tasks/sync") return route.abort();
  if (request.method() === "GET")
    return route.fulfill({ status: 200, json: { tasks: [...cloud.values()], nextCursor: null } });
  const results = request.postDataJSON().operations.map((operation) => {
    assert.equal(operation.accountId, accountId);
    const task = { ...operation.payload, updatedAt: operation.clientUpdatedAt };
    cloud.set(task.id, task);
    return { operationId: operation.operationId, taskId: task.id, status: "applied", task };
  });
  return route.fulfill({ status: 200, json: { results } });
}
async function launch(version) {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  const child = spawn(
    executable,
    [`--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, "--proxy-server=http://127.0.0.1:1"],
    {
      windowsHide: true,
      stdio: "ignore",
      env: {
        ...process.env,
        TASKFLOW_DISABLE_UPDATE_CHECK: "1",
        ELECTRON_START_URL: "app://taskflow/tasks/?status=all",
      },
    },
  );
  let browser;
  try {
    for (let i = 0; i < 160; i++) {
      if (child.exitCode !== null) throw new Error(`安装程序提前退出 ${child.exitCode}`);
      try {
        browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
        break;
      } catch {
        await delay(250);
      }
    }
    assert.ok(browser, "无法连接已安装程序");
    const context = browser.contexts()[0];
    await context.route(/^https?:\/\//, mockCloud);
    for (let i = 0; i < 100 && !context.pages().length; i++) await delay(100);
    const page = context.pages()[0];
    await page.waitForLoadState("domcontentloaded");
    await expect
      .poll(() => page.evaluate(async () => (await window.taskflowDesktop?.updates.getState())?.currentVersion))
      .toBe(version);
    assert.ok(await exists(path.join(profile, "taskflow.sqlite")), "未使用隔离测试数据库");
    app = { child, browser, context, page };
  } catch (error) {
    child.kill();
    await browser?.close().catch(() => {});
    throw error;
  }
}
async function close() {
  if (!app) return;
  const current = app;
  app = null;
  const cdp = await current.browser.newBrowserCDPSession();
  void cdp.send("Browser.close").catch(() => {});
  for (let i = 0; i < 60 && current.child.exitCode === null; i++) await delay(250);
  if (current.child.exitCode === null) {
    current.child.kill();
    throw new Error("验收程序未正常退出");
  }
  await Promise.race([current.browser.close().catch(() => {}), delay(1000)]);
}
const bridge = (group, method, input) =>
  app.page.evaluate(async ({ group, method, input }) => window.taskflowDesktop[group][method](input), {
    group,
    method,
    input,
  });
const local = (taskId) => bridge("localTasks", "get", { accountId, taskId });
const queue = () => bridge("syncQueue", "list", { accountId });
async function hashes() {
  return Object.fromEntries(
    await Promise.all(
      ["taskflow.sqlite", "taskflow.sqlite.key", "Local State", "taskflow.auth"].map(async (name) => [
        name,
        await digest(path.join(profile, name)),
      ]),
    ),
  );
}
async function manual() {
  const button = app.page.getByRole("button", { name: "立即同步", exact: true }).first();
  await button.click();
  await expect(button).toHaveAttribute("aria-busy", "false");
}
try {
  assert.equal(await digest(oldInstaller), oldSha, "旧版安装包与已保存的公开发布哈希不匹配");
  const extracted = path.join(root, "old-installer");
  await run(seven, ["x", oldInstaller, `-o${extracted}`, "-y"], true);
  let oldRuntime = extracted;
  if (!(await exists(path.join(oldRuntime, "resources/app.asar")))) {
    const archive = path.join(extracted, "$PLUGINSDIR", "app-64.7z");
    await access(archive);
    oldRuntime = path.join(root, "old-runtime");
    await run(seven, ["x", archive, `-o${oldRuntime}`, "-y"], true);
  }
  const oldApp = await prepareRuntime(oldRuntime, path.join(root, "old-runtime-isolated"), "2.2.0-beta.2");
  const newApp = await prepareRuntime(
    path.join(candidate, "win-unpacked"),
    path.join(root, "new-runtime-isolated"),
    pkg.version,
  );
  record("核对真实 beta.2 安装包 SHA-256，并提取旧版与候选的真实代码");
  const oldCheck = await buildIsolated(oldApp, "2.2.0-beta.2");
  const newCheck = await buildIsolated(newApp, pkg.version);
  if (resumeId && (await exists(profile))) {
    const backup = `${profile}.previous-${Date.now()}`;
    assert.ok(backup.startsWith(root + path.sep));
    await rename(profile, backup);
    report.previousAttemptProfile = backup;
  }
  assert.equal(await exists(profile), false, "必须使用全新隔离测试资料");
  await install(oldCheck, "2.2.0-beta.2");
  await launch("2.2.0-beta.2");
  const task = await bridge("localTasks", "create", {
    accountId: "local:device",
    task: {
      title: "真实旧版待同步任务",
      description: "升级后应保留的正文",
      status: "todo",
      priority: "high",
      tags: "升级验收",
      dueDate: "",
    },
  });
  await bridge("auth", "set", auth);
  await bridge("workspace", "connect");
  const pendingIds = (await queue()).map((operation) => operation.operationId);
  assert.ok(pendingIds.length);
  await close();
  const before = await hashes();
  record("真实旧版创建任务、加密身份、已开启云连接和非空队列");
  await install(newCheck, pkg.version);
  assert.deepEqual(await hashes(), before, "覆盖安装期间不得改写用户数据");
  phase = "idle";
  attempts = [];
  await launch(pkg.version);
  assert.equal((await local(task.id)).description, task.description);
  assert.equal((await bridge("auth", "get")).user.id, accountId);
  assert.deepEqual(await bridge("workspace", "get"), { accountId, syncEnabled: true });
  assert.deepEqual(
    (await queue()).map((operation) => operation.operationId),
    pendingIds,
  );
  record("覆盖升级后旧任务、身份、云端连接和原操作 ID 完整恢复", {
    beforeUpgrade: before,
    afterUpgrade: await hashes(),
  });
  // Fresh renderer proves encrypted auth restores locally rather than relying on an old tab.
  await app.page.goto("app://taskflow/settings/");
  await expect(app.page.getByRole("button", { name: "立即同步", exact: true }).first()).toBeVisible();
  await app.page.evaluate(() => {
    window.dispatchEvent(new Event("online"));
    window.dispatchEvent(new Event("focus"));
  });
  for (let i = 0; i < 4; i++) {
    await delay(30_000);
    assert.deepEqual(attempts, [], "闲置期间出现自动请求");
    console.log(`PASS: 新版闲置 ${(i + 1) * 30} 秒无云端请求`);
  }
  record("启动、重载、联网恢复与闲置 120 秒无 HTTP 请求");
  phase = "manual";
  cloud.set("remote-only", { ...task, id: "remote-only", title: "模拟云端独立任务" });
  await manual();
  await expect.poll(async () => (await queue()).length).toBe(0);
  assert.equal(cloud.get(task.id).description, task.description);
  assert.ok(await local("remote-only"));
  assert.deepEqual(attempts, ["POST /api/tasks/sync", "GET /api/tasks/sync"]);
  record("点击一次手动同步流程，上传原队列并下载云端任务");
  const evolved = await bridge("localTasks", "executeEvolution", {
    accountId,
    taskId: task.id,
    command: {
      operationId: "upgrade-exploration",
      expectedRevision: 0,
      action: { type: "create_branch", title: "升级后探索", question: "历史能否持续保存？" },
    },
  });
  assert.equal(evolved.evolution.branches[0].title, "升级后探索");
  fail = true;
  attempts = [];
  await manual();
  await expect(app.page.getByText("同步未完成", { exact: true })).toBeVisible();
  assert.equal(attempts.length, 1);
  assert.equal((await local(task.id)).evolution.revision, 1);
  const queuedEvolution = (await queue())[0].operationId;
  await delay(5000);
  assert.equal(attempts.length, 1, "失败后不应自动重试");
  await app.page.screenshot({ path: path.join(root, "manual-sync-failure.png") });
  await close();
  phase = "idle";
  attempts = [];
  await launch(pkg.version);
  assert.equal((await local(task.id)).evolution.branches[0].title, "升级后探索");
  assert.equal((await queue())[0].operationId, queuedEvolution);
  assert.deepEqual(attempts, []);
  await app.page.goto(`app://taskflow/tasks/${task.id}/`);
  await expect(app.page.getByRole("heading", { name: "演进记录", exact: true })).toBeVisible();
  await app.page.screenshot({ path: path.join(root, "upgraded-evolution.png") });
  record("云端失败不自动重试，断网冷启动恢复新增探索历史和待同步队列");
  await close();
  const uninstaller = (await readdir(installDir)).find((name) => /^Uninstall .*\.exe$/.test(name));
  assert.ok(uninstaller && path.resolve(installDir, uninstaller).startsWith(root + path.sep));
  const preserved = await hashes();
  await run(path.join(installDir, uninstaller), ["/S", "/currentuser"]);
  await expect.poll(() => exists(executable)).toBe(false);
  assert.deepEqual(await hashes(), preserved);
  record("卸载隔离安装，测试数据文件保持一致，日常安装未操作");
  report.passed = true;
} catch (error) {
  report.error = error.stack ?? String(error);
  throw error;
} finally {
  await close().catch((error) => {
    report.closeError = String(error);
  });
  report.testInstallationRemaining = await exists(executable);
  report.finishedAt = new Date().toISOString();
  await writeFile(path.join(root, "report.json"), JSON.stringify(report, null, 2));
  console.log(`Report: ${path.join(root, "report.json")}`);
}
