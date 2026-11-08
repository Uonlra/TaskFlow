import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, writeFile, copyFile, rm } from "node:fs/promises";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parse } from "yaml";
import policyModule from "./lib/desktop-release-policy.cjs";

const { getReleasePolicy, createDesktopBuildConfig, releaseAssetNames, assertPublishedRelease } = policyModule;
const pkg = JSON.parse(await readFile("package.json", "utf8"));
const require = createRequire(import.meta.url);

test("builder configuration follows the version, overriding stale publish channel without changing package.json", () => {
  const before = JSON.stringify(pkg);
  for (const [version, channel] of [
    ["2.2.0-beta.2", "beta"],
    ["2.2.0", "latest"],
  ]) {
    const config = createDesktopBuildConfig({ ...pkg, version });
    assert.equal(config.publish.channel, channel);
    assert.equal(config.publish.releaseType, "draft");
    assert.equal(config.generateUpdatesFilesForAllChannels, false);
    assert.equal(config.appId, pkg.build.appId);
    assert.equal(config.nsis.deleteAppDataOnUninstall, false);
  }
  assert.equal(JSON.stringify(pkg), before);
  assert.deepEqual(require("../electron-builder.config.cjs"), createDesktopBuildConfig(pkg));
  assert.throws(() =>
    createDesktopBuildConfig({
      ...pkg,
      build: { ...pkg.build, extraMetadata: { version: "2.2.0" } },
      version: "2.2.0-beta.2",
    }),
  );
});

test("rejects noncanonical versions and wrong release tags before building", () => {
  for (const version of [
    "v2.2.0",
    "2.2",
    "2.2.0-rc.1",
    "2.2.0-alpha.1",
    "2.2.0-beta",
    "2.2.0-beta.01",
    "02.2.0",
    "2.2.0+build.1",
    "2.2.0\n",
    "9007199254740992.0.0",
  ]) {
    assert.throws(() => getReleasePolicy(version), version);
  }
  assert.throws(() => getReleasePolicy("2.2.0", "v2.2.0-beta.2"));
  assert.throws(() => getReleasePolicy("2.2.0-beta.2", "v2.2.0"));
  assert.equal(getReleasePolicy("0.0.0-beta.0").channel, "beta");
});

for (const version of ["2.2.0-beta.2", "2.2.0"]) {
  test(`${version}: public release rejects wrong release status and mixed channel files`, () => {
    const p = getReleasePolicy(version);
    const release = {
      tag_name: p.tag,
      draft: false,
      prerelease: p.prerelease,
      assets: releaseAssetNames(p).map((name) => ({ name })),
    };
    assertPublishedRelease(release, p);
    assert.throws(() => assertPublishedRelease({ ...release, draft: true }, p));
    assert.throws(() => assertPublishedRelease({ ...release, prerelease: !p.prerelease }, p));
    assert.throws(() =>
      assertPublishedRelease({ ...release, assets: [...release.assets, { name: p.oppositeMetadataFile }] }, p),
    );
    assert.throws(() =>
      assertPublishedRelease(
        {
          ...release,
          assets: release.assets.map((a) => ({ name: a.name === p.metadataFile ? p.oppositeMetadataFile : a.name })),
        },
        p,
      ),
    );
  });
}

test("actual GitHub provider keeps stable clients off newer beta releases and allows beta to stable migration", async () => {
  const updaterRequire = createRequire(require.resolve("electron-updater/package.json"));
  const { GitHubProvider } = updaterRequire("./out/providers/GitHubProvider.js");
  const semver = updaterRequire("semver");
  const xml = `<feed><entry><title>beta</title><link href="https://github.com/Uonlra/TaskFlow/releases/tag/v2.3.0-beta.1"/></entry><entry><title>stable</title><link href="https://github.com/Uonlra/TaskFlow/releases/tag/v2.2.0"/></entry></feed>`;
  for (const currentVersion of ["2.1.0", "2.2.0-beta.2"]) {
    const p = getReleasePolicy(currentVersion);
    const requests = [];
    const executor = {
      request: async (options) => {
        const url = options.path;
        requests.push(url);
        if (url.endsWith(".atom")) return xml;
        if (url.endsWith("/latest")) return JSON.stringify({ tag_name: "v2.2.0" });
        const version = url.includes("v2.3.0-beta.1") ? "2.3.0-beta.1" : "2.2.0";
        return `version: ${version}\npath: app.exe\nsha512: example\nfiles:\n  - url: app.exe\n    sha512: example\n`;
      },
    };
    const provider = new GitHubProvider(
      { provider: "github", owner: "Uonlra", repo: "TaskFlow", channel: p.channel },
      {
        channel: p.channel,
        allowPrerelease: p.prerelease,
        currentVersion: semver.parse(currentVersion),
        fullChangelog: false,
      },
      { executor, platform: "win32" },
    );
    const info = await provider.getLatestVersion();
    if (!p.prerelease) {
      assert.equal(info.version, "2.2.0");
      assert.ok(requests.some((url) => url.includes("v2.2.0/latest.yml")));
      assert.equal(
        requests.some((url) => url.includes("beta.yml")),
        false,
      );
    } else {
      // Remove the future beta to model a stable release becoming the newest entry.
      const fallbackRequests = [];
      executor.request = async (options) => {
        fallbackRequests.push(options.path);
        if (options.path.endsWith(".atom"))
          return `<feed><entry><title>stable</title><link href="https://github.com/Uonlra/TaskFlow/releases/tag/v2.2.0"/></entry></feed>`;
        if (options.path.endsWith("beta.yml")) throw new Error("HTTP 404: stable releases have no beta.yml");
        return "version: 2.2.0\npath: app.exe\nsha512: example\nfiles:\n  - url: app.exe\n    sha512: example\n";
      };
      assert.equal((await provider.getLatestVersion()).version, "2.2.0");
      assert.ok(fallbackRequests.some((url) => url.endsWith("latest.yml")));
    }
  }
});

test("both channels pass the actual artifact verifier; wrong channel files and app-update configuration fail", async () => {
  const builderRequire = createRequire(require.resolve("electron-builder/package.json"));
  const archiveRequire = createRequire(builderRequire.resolve("app-builder-lib/package.json"));
  const asar = archiveRequire("@electron/asar");
  const script = fileURLToPath(new URL("./verify-desktop-release.mjs", import.meta.url));
  for (const version of ["2.2.0-beta.2", "2.2.0"]) {
    const root = await mkdtemp(path.join(os.tmpdir(), "taskflow-release-verifier-"));
    try {
      const p = getReleasePolicy(version);
      const out = path.join(root, "out");
      const source = path.join(root, "app");
      const resources = path.join(out, "win-unpacked/resources");
      await mkdir(resources, { recursive: true });
      await mkdir(path.join(source, "electron"), { recursive: true });
      await mkdir(path.join(source, "electron/assets"), { recursive: true });
      await copyFile(
        fileURLToPath(new URL("../electron/assets/tray.ico", import.meta.url)),
        path.join(source, "electron/assets/tray.ico"),
      );
      const fixturePkg = { version, main: "electron/main.cjs" };
      await writeFile(path.join(root, "package.json"), JSON.stringify(fixturePkg));
      await writeFile(path.join(source, "package.json"), JSON.stringify(fixturePkg));
      await writeFile(path.join(source, "electron/main.cjs"), "// verifier fixture; never executed");
      await asar.createPackage(source, path.join(resources, "app.asar"));
      const installer = releaseAssetNames(p)[0];
      // A known executable avoids OS-specific signature errors; this is not an NSIS install test.
      if (process.platform === "win32") await copyFile(process.execPath, path.join(out, installer));
      else await writeFile(path.join(out, installer), "fixture installer payload");
      const bytes = await readFile(path.join(out, installer));
      const sha512 = createHash("sha512").update(bytes).digest("base64");
      await writeFile(path.join(out, installer + ".blockmap"), "fixture blockmap");
      await writeFile(
        path.join(out, p.metadataFile),
        JSON.stringify({ version, path: installer, sha512, files: [{ url: installer, sha512, size: bytes.length }] }),
      );
      const settings = { provider: "github", owner: "Uonlra", repo: "TaskFlow", channel: p.channel };
      await writeFile(path.join(resources, "app-update.yml"), JSON.stringify(settings));
      const invoke = () =>
        spawnSync(process.execPath, [script, out], {
          cwd: root,
          env: { ...process.env, GITHUB_SHA: "a".repeat(40) },
          encoding: "utf8",
        });
      const valid = invoke();
      assert.equal(valid.status, 0, valid.stderr);
      const manifest = JSON.parse(await readFile(path.join(out, "release-manifest.json"), "utf8"));
      assert.equal(manifest.channel, p.channel);
      assert.equal(manifest.version, version);
      assert.equal(manifest.files.length, 3);
      await writeFile(path.join(out, p.oppositeMetadataFile), "version: wrong");
      assert.notEqual(invoke().status, 0, "Mixed metadata must fail");
      await rm(path.join(out, p.oppositeMetadataFile));
      await writeFile(
        path.join(resources, "app-update.yml"),
        JSON.stringify({ ...settings, channel: p.prerelease ? "latest" : "beta" }),
      );
      assert.notEqual(invoke().status, 0, "Wrong installed channel must fail");
    } finally {
      // mkdtemp produces a dedicated test directory; never remove installation or user data.
      assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("workflow preflight checks immutable tag commit, public variables and release notes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "taskflow-release-preflight-"));
  const script = fileURLToPath(new URL("./prepare-desktop-release.mjs", import.meta.url));
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  try {
    await mkdir(path.join(root, "docs/releases"), { recursive: true });
    await writeFile(path.join(root, "package.json"), JSON.stringify({ version: "2.2.0" }));
    await writeFile(path.join(root, "docs/releases/v2.2.0.md"), "fixture notes");
    git("init", "-q");
    git("add", ".");
    git("-c", "user.name=TaskFlow Test", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "fixture");
    git("tag", "v2.2.0");
    const output = path.join(root, "outputs.txt");
    const env = {
      ...process.env,
      GITHUB_SHA: git("rev-parse", "HEAD"),
      GITHUB_OUTPUT: output,
      REQUESTED_TAG: "v2.2.0",
      NEXT_PUBLIC_APPWRITE_ENDPOINT: "https://example.invalid/v1",
      NEXT_PUBLIC_APPWRITE_PROJECT_ID: "fixture",
    };
    const invoke = (overrides = {}) =>
      spawnSync(process.execPath, [script], { cwd: root, env: { ...env, ...overrides }, encoding: "utf8" });
    assert.equal(invoke().status, 0);
    assert.match(await readFile(output, "utf8"), /channel=latest\nmetadata=latest.yml\nprerelease=false/);
    assert.notEqual(invoke({ REQUESTED_TAG: "v2.2.0-beta.2" }).status, 0);
    assert.notEqual(invoke({ NEXT_PUBLIC_APPWRITE_PROJECT_ID: "" }).status, 0);
    await rm(path.join(root, "docs/releases/v2.2.0.md"));
    assert.notEqual(invoke().status, 0);
    await writeFile(path.join(root, "docs/releases/v2.2.0.md"), "fixture notes");
    git(
      "-c",
      "user.name=TaskFlow Test",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "--allow-empty",
      "-qm",
      "different commit",
    );
    assert.notEqual(invoke({ GITHUB_SHA: git("rev-parse", "HEAD") }).status, 0);
  } finally {
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
    await rm(root, { recursive: true, force: true });
  }
});

test("workflow remains draft-only and uploads the selected channel metadata", async () => {
  const workflow = parse(await readFile(".github/workflows/desktop-beta.yml", "utf8"));
  const steps = workflow.jobs["build-draft"].steps;
  assert.deepEqual(workflow.on.push.tags, ["v*"]);
  assert.ok(steps.some((s) => s.run === "node scripts/prepare-desktop-release.mjs" && s.id === "release"));
  const upload = steps.find((s) => s.uses?.startsWith("actions/upload-artifact"));
  assert.ok(upload.with.path.includes("steps.release.outputs.metadata"));
  const publish = steps.find((s) => s.name === "Create or refresh draft release");
  assert.ok(publish.run.includes("@('--draft')"));
  assert.ok(publish.run.includes("if ($isPrerelease)"));
  assert.equal(publish.run.includes("--draft=false"), false);
});

test("Windows PowerShell parses the actual draft publishing step", { skip: process.platform !== "win32" }, async () => {
  const workflow = parse(await readFile(".github/workflows/desktop-beta.yml", "utf8"));
  const step = workflow.jobs["build-draft"].steps.find((entry) => entry.name === "Create or refresh draft release");
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "$tokens = $null; $errors = $null; [void][System.Management.Automation.Language.Parser]::ParseInput($env:TASKFLOW_WORKFLOW_SCRIPT, [ref]$tokens, [ref]$errors); if ($errors.Count) { $errors | ForEach-Object { Write-Error $_.Message }; exit 1 }",
    ],
    { env: { ...process.env, TASKFLOW_WORKFLOW_SCRIPT: step.run }, windowsHide: true },
  );
});
