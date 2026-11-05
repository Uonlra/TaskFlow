import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, expect as baseExpect } from "@playwright/test";

assert.equal(process.platform, "win32", "此验收只支持 Windows");
const expect = baseExpect.configure({ timeout: 15_000 });
const require = createRequire(import.meta.url);
const pkg = JSON.parse(await readFile("package.json", "utf8"));
const resumeId = process.argv.find((arg) => arg.startsWith("--resume="))?.slice("--resume=".length);
if (resumeId) assert.match(resumeId, /^\d+$/, "恢复参数只能是已有验收的时间戳");
const id = resumeId ?? Date.now().toString();
const root = path.resolve(`dist/install-acceptance/run-${id}`);
const installDir = path.join(root, "installed");
const productName = `TaskFlow Install Check ${id}`;
const packageName = `taskflow-install-check-${id}`;
const profile = path.join(process.env.APPDATA, productName);
const executable = path.join(installDir, "TaskFlowInstallCheck.exe");
const electronZip = path.resolve(
  `dist/electron-cache/electron-v${pkg.devDependencies.electron.replace(/^[~^]/, "")}-win32-x64.zip`,
);
await access(electronZip);
await access("desktop-web/out/index.html");
await mkdir(root, { recursive: true });
const report = { root, productName, profile, startedAt: new Date().toISOString(), steps: [], passed: false };
const record = (step) => {
  report.steps.push(step);
  console.log(`PASS: ${step}`);
};
const exists = async (file) =>
  access(file).then(
    () => true,
    () => false,
  );

async function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, stdio: "inherit", ...options });
    child.once("error", reject);
    child.once("exit", (code, signal) =>
      code === 0 ? resolve() : reject(new Error(`${path.basename(command)} 退出：${code ?? signal}`)),
    );
  });
}

async function build(version) {
  const installer = path.join(root, version, `InstallCheck-${version}.exe`);
  const configFile = path.join(root, `builder-${version}.json`);
  if (resumeId) {
    const existing = JSON.parse(await readFile(configFile, "utf8"));
    assert.equal(existing.appId, `top.uta4k.taskflow.installcheck.${id}`);
    assert.equal(existing.productName, productName);
    assert.equal(existing.extraMetadata.name, packageName);
    assert.equal(existing.extraMetadata.version, version);
    assert.equal(existing.nsis.deleteAppDataOnUninstall, false);
    await access(installer);
    return installer;
  }
  const config = {
    ...pkg.build,
    appId: `top.uta4k.taskflow.installcheck.${id}`,
    productName,
    executableName: "TaskFlowInstallCheck",
    extraMetadata: { name: packageName, productName, version },
    directories: { output: path.join(root, version) },
    artifactName: "InstallCheck-${version}.${ext}",
    electronDist: electronZip,
    nsis: { ...pkg.build.nsis, createDesktopShortcut: false, createStartMenuShortcut: false, runAfterFinish: false },
  };
  await writeFile(configFile, JSON.stringify(config, null, 2));
  await run(
    process.execPath,
    [require.resolve("electron-builder/cli.js"), "--win", "--x64", `--config=${configFile}`, "--publish", "never"],
    {
      env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: "false" },
    },
  );
  return installer;
}

async function install(installer, version) {
  // NSIS requires /D to be last. Only this run's private installation is targeted.
  await run(installer, ["/S", "/currentuser", `/D=${installDir}`]);
  await expect.poll(() => exists(executable)).toBe(true);
  await run(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "$v=(Get-Item -LiteralPath $env:TASKFLOW_CHECK_EXE).VersionInfo.ProductVersion; if ($v -ne $env:TASKFLOW_CHECK_VERSION -and $v -ne ($env:TASKFLOW_CHECK_VERSION + '.0')) { throw \"Unexpected installed version: $v\" }",
    ],
    {
      env: { ...process.env, TASKFLOW_CHECK_EXE: executable, TASKFLOW_CHECK_VERSION: version },
    },
  );
}

async function uninstall() {
  const name = (await readdir(installDir)).find((file) => /^Uninstall .*\.exe$/.test(file));
  assert.ok(name, "未找到测试安装的卸载程序");
  const uninstaller = path.resolve(installDir, name);
  assert.ok(uninstaller.startsWith(`${root}${path.sep}`), "卸载路径必须位于本次验收目录");
  await run(uninstaller, ["/S", "/currentuser"]);
  // NSIS may launch a temporary uninstaller and return before deletion finishes.
  await expect.poll(() => exists(executable), { timeout: 30_000 }).toBe(false);
}

async function profileHashes() {
  const files = ["taskflow.sqlite", "taskflow.sqlite.key", "Local State", "taskflow.auth"];
  return Object.fromEntries(
    await Promise.all(
      files.map(async (file) => [
        file,
        createHash("sha256")
          .update(await readFile(path.join(profile, file)))
          .digest("hex"),
      ]),
    ),
  );
}

async function launch() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  // Use the default Electron userData directory, so uninstall retention is real.
  const child = spawn(executable, [`--remote-debugging-port=${port}`, "--proxy-server=http://127.0.0.1:1"], {
    windowsHide: true,
    stdio: "ignore",
    env: {
      ...process.env,
      TASKFLOW_DISABLE_UPDATE_CHECK: "1",
      ELECTRON_START_URL: "app://taskflow/tasks/?status=all",
      TASKFLOW_WEB_URL: "app://taskflow/tasks/?status=all",
    },
  });
  let spawnError;
  child.on("error", (error) => {
    spawnError = error;
  });
  let browser;
  try {
    for (let i = 0; i < 160; i++) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null) throw new Error(`桌面进程提前退出：${child.exitCode}`);
      try {
        browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
        break;
      } catch {
        await delay(250);
      }
    }
    assert.ok(browser, "无法连接测试安装程序");
    const context = browser.contexts()[0];
    await context.route(/^https?:\/\//, (route) => route.abort("internetdisconnected"));
    for (let i = 0; i < 160 && !context.pages().length; i++) await delay(250);
    const page = context.pages()[0];
    assert.ok(page, "测试安装未打开窗口");
    await page.waitForLoadState("domcontentloaded");
    await expect.poll(() => page.evaluate(() => window.taskflowDesktop.workspace.get())).toBeTruthy();
    assert.ok(await exists(path.join(profile, "taskflow.sqlite")), "默认数据目录不符合隔离配置，停止验收");
    return { child, browser, page };
  } catch (error) {
    child.kill();
    await browser?.close();
    throw error;
  }
}

async function close(app) {
  if (!app) return;
  const cdp = await app.browser.newBrowserCDPSession();
  void cdp.send("Browser.close").catch(() => undefined);
  for (let i = 0; i < 40 && app.child.exitCode === null && app.child.signalCode === null; i++) await delay(250);
  if (app.child.exitCode === null && app.child.signalCode === null) {
    app.child.kill();
    throw new Error("程序未正常退出");
  }
  await Promise.race([app.browser.close().catch(() => undefined), delay(1000)]);
}

let app;
let task;
async function verifyData() {
  const restored = await app.page.evaluate(async (taskId) => {
    const b = window.taskflowDesktop;
    const workspace = await b.workspace.get();
    return {
      workspace,
      task: await b.localTasks.get({ accountId: workspace.accountId, taskId }),
      auth: await b.auth.get(),
      queue: await b.syncQueue.list({ accountId: workspace.accountId }),
    };
  }, task.id);
  assert.deepEqual(restored.workspace, { accountId: "install-smoke", syncEnabled: false });
  assert.equal(restored.task.description, "安装升级及卸载重装验收");
  assert.equal(restored.task.status, "done");
  assert.equal(restored.auth.user.id, "install-smoke");
  assert.ok(
    restored.queue.some((op) => op.taskId === task.id),
    "待同步队列应保留",
  );
  await expect(app.page.getByRole("heading", { name: task.title, exact: true }).first()).toBeVisible();
}

try {
  if (resumeId && (await exists(profile))) {
    // Preserve a failed run's data before rerunning with a clean fixture.
    const previous = `${profile}.previous-attempt-${Date.now()}`;
    assert.equal(path.dirname(path.resolve(profile)), path.resolve(process.env.APPDATA));
    assert.equal(path.dirname(path.resolve(previous)), path.resolve(process.env.APPDATA));
    assert.equal(path.basename(profile), `TaskFlow Install Check ${id}`);
    assert.equal(await exists(previous), false);
    await rename(profile, previous);
    report.previousAttemptProfile = previous;
  }
  assert.equal(await exists(profile), false, "必须使用全新独立数据目录");
  const first = await build("2.1.1");
  const upgrade = await build("2.1.2");
  await install(first, "2.1.1");
  app = await launch();
  task = await app.page.evaluate(async () => {
    const b = window.taskflowDesktop;
    const created = await b.localTasks.create({
      accountId: "local:device",
      task: {
        title: "安装保留验收任务",
        description: "安装升级及卸载重装验收",
        status: "todo",
        priority: "high",
        tags: "安装验收",
        dueDate: "",
      },
    });
    await b.auth.set({ user: { id: "install-smoke" }, profile: { id: "install-smoke" }, session: null });
    await b.workspace.connect();
    await b.workspace.pause();
    await b.localTasks.updateStatus({ accountId: "install-smoke", taskId: created.id, status: "done" });
    return created;
  });
  await close(app);
  app = null;
  record("首次安装 2.1.1 可启动、创建任务并保存加密身份、工作区和队列");
  const beforeUpgrade = await profileHashes();
  await install(upgrade, "2.1.2");
  assert.deepEqual(await profileHashes(), beforeUpgrade, "覆盖安装期间不应修改用户数据");
  app = await launch();
  await verifyData();
  await close(app);
  app = null;
  record("覆盖升级到 2.1.2 后任务、完成状态、加密身份、工作区和队列完整保留");
  const beforeUninstall = await profileHashes();
  await uninstall();
  assert.deepEqual(await profileHashes(), beforeUninstall, "卸载必须保留数据库、密钥、Local State 和身份文件");
  record("默认卸载移除程序且用户数据文件哈希保持一致");
  await install(upgrade, "2.1.2");
  app = await launch();
  await verifyData();
  await close(app);
  app = null;
  record("卸载后重新安装 2.1.2 可解密并恢复原任务、身份、工作区和队列");
  const finalHashes = await profileHashes();
  await uninstall();
  assert.deepEqual(await profileHashes(), finalHashes);
  report.passed = true;
} catch (error) {
  report.error = error.stack ?? String(error);
  throw error;
} finally {
  await close(app);
  // On failure keep the private install for diagnosis; never uninstall another app.
  report.testInstallationRemaining = await exists(executable);
  report.finishedAt = new Date().toISOString();
  await writeFile(path.join(root, "report.json"), JSON.stringify(report, null, 2));
  console.log(`验收报告：${path.join(root, "report.json")}`);
  console.log(`保留的隔离测试数据：${profile}`);
}
