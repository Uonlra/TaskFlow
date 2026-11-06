import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { parse } from "yaml";

// Reads public GitHub endpoints only. Never installs an update or opens user data.
const pkg = JSON.parse(await readFile("package.json", "utf8"));
const version = process.argv.find((arg) => arg.startsWith("--version="))?.slice(10) ?? pkg.version;
assert.match(version, /^\d+\.\d+\.\d+-beta\.\d+$/);
const download = process.argv.includes("--download");
if (download) assert.equal(process.platform, "win32", "完整下载模式使用 Windows 系统下载器");
const root = path.resolve(`dist/published-verification/${version}-${Date.now()}`);
await mkdir(root, { recursive: true });
const tag = `v${version}`;
const installer = `TaskFlow-Setup-${version}-win-x64.exe`;
const names = [installer, `${installer}.blockmap`, "beta.yml", "SHA256SUMS.txt", "release-manifest.json"];
const report = { version, tag, startedAt: new Date().toISOString(), download, passed: false, checks: [] };
const record = (step) => {
  report.checks.push(step);
  console.log(`PASS: ${step}`);
};
async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "User-Agent": "TaskFlow-release-verification", ...options.headers },
    signal: AbortSignal.timeout(30_000),
  });
  assert.equal(response.status, 200, `${url}: HTTP ${response.status}`);
  return response;
}
async function digest(file, algorithm, encoding = "hex") {
  const hash = createHash(algorithm);
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest(encoding);
}
try {
  const release = await (await request(`https://api.github.com/repos/Uonlra/TaskFlow/releases/tags/${tag}`)).json();
  assert.equal(release.tag_name, tag);
  assert.equal(release.draft, false);
  assert.equal(release.prerelease, true);
  assert.equal(release.assets.length, names.length);
  assert.deepEqual(release.assets.map((asset) => asset.name).sort(), [...names].sort());
  report.releaseUrl = release.html_url;
  record("公开版本为预发布且 5 个附件齐全");

  const base = `https://github.com/Uonlra/TaskFlow/releases/download/${tag}/`;
  for (const asset of release.assets) {
    assert.equal(asset.browser_download_url, base + asset.name);
    assert.match(asset.digest, /^sha256:[a-f0-9]{64}$/);
    const response = await request(asset.browser_download_url, { method: "HEAD" });
    assert.equal(Number(response.headers.get("content-length")), asset.size, asset.name);
  }
  record("全部附件可匿名访问，文件大小正确");

  const metadata = new Map();
  for (const name of ["beta.yml", "SHA256SUMS.txt", "release-manifest.json"]) {
    const bytes = Buffer.from(await (await request(base + name)).arrayBuffer());
    const asset = release.assets.find((item) => item.name === name);
    assert.equal(`sha256:${createHash("sha256").update(bytes).digest("hex")}`, asset.digest);
    await writeFile(path.join(root, name), bytes);
    metadata.set(name, bytes.toString("utf8"));
  }
  const manifest = JSON.parse(metadata.get("release-manifest.json"));
  assert.equal(manifest.version, version);
  assert.equal(manifest.tag, tag);
  assert.equal(manifest.channel, "beta");
  assert.match(manifest.sourceCommit, /^[a-f0-9]{40}$/);
  // Resolve the immutable tag rather than trusting target_commitish (which may be a branch).
  const commit = await (await request(`https://api.github.com/repos/Uonlra/TaskFlow/commits/${tag}`)).json();
  assert.equal(manifest.sourceCommit, commit.sha);
  assert.deepEqual(
    manifest.files.map((file) => file.file).sort(),
    [installer, `${installer}.blockmap`, "beta.yml"].sort(),
  );
  for (const file of manifest.files) {
    const asset = release.assets.find((item) => item.name === file.file);
    assert.equal(`sha256:${file.sha256}`, asset.digest);
    assert.equal(file.size, asset.size);
  }
  const sums = metadata.get("SHA256SUMS.txt").trim().split(/\r?\n/).sort();
  assert.deepEqual(sums, manifest.files.map((file) => `${file.sha256}  ${file.file}`).sort());
  report.sourceCommit = commit.sha;
  report.authenticode = manifest.authenticode;
  record("发布清单、不可变标签提交及 SHA-256 清单一致");

  // Exercise the installed updater's actual GitHub feed parser and channel selection.
  const require = createRequire(import.meta.url);
  const updaterRequire = createRequire(require.resolve("electron-updater/package.json"));
  const { GitHubProvider } = updaterRequire("./out/providers/GitHubProvider.js");
  const semver = updaterRequire("semver");
  const executor = {
    async request(options) {
      const url = new URL(
        `${options.protocol}//${options.hostname}${options.port ? `:${options.port}` : ""}${options.path}`,
      );
      return (await request(url, { headers: options.headers })).text();
    },
  };
  const provider = new GitHubProvider(
    { provider: "github", owner: "Uonlra", repo: "TaskFlow", channel: "beta" },
    { channel: "beta", allowPrerelease: true, currentVersion: semver.parse(version), fullChangelog: false },
    { executor, platform: "win32", isUseMultipleRangeRequest: false },
  );
  const info = await provider.getLatestVersion();
  assert.equal(info.version, version, "当前 beta 更新源已指向其他版本；请指定最新版本进行检查");
  assert.equal(info.tag, tag);
  const yaml = parse(metadata.get("beta.yml"));
  assert.equal(yaml.version, version);
  assert.equal(yaml.path, installer);
  assert.equal(yaml.files.length, 1);
  assert.equal(yaml.files[0].url, installer);
  assert.equal(yaml.files[0].size, release.assets.find((asset) => asset.name === installer).size);
  assert.equal(yaml.sha512, yaml.files[0].sha512);
  assert.equal(info.files[0].sha512, yaml.sha512);
  assert.equal(provider.resolveFiles(info)[0].url.href, base + installer);
  record("真实 GitHub Atom feed、beta 通道与安装包解析正确");

  if (download) {
    for (const name of [installer, `${installer}.blockmap`]) {
      // Literal script + environment arguments avoid interpolating URLs or paths into shell code.
      execFileSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          "$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -UseBasicParsing -Uri $env:TASKFLOW_PUBLIC_URL -OutFile $env:TASKFLOW_PUBLIC_FILE -TimeoutSec 180",
        ],
        {
          env: { ...process.env, TASKFLOW_PUBLIC_URL: base + name, TASKFLOW_PUBLIC_FILE: path.join(root, name) },
          windowsHide: true,
          stdio: "inherit",
          timeout: 200_000,
        },
      );
    }
    for (const asset of release.assets) {
      const file = path.join(root, asset.name);
      assert.equal((await stat(file)).size, asset.size);
      assert.equal(`sha256:${await digest(file, "sha256")}`, asset.digest);
    }
    assert.equal(await digest(path.join(root, installer), "sha512", "base64"), yaml.sha512);
    record("5 个公开下载文件 SHA-256 和安装包 SHA-512 通过");
  }
  report.passed = true;
} catch (error) {
  report.error = error.message;
  console.error(error);
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  report.limitations = "仅验证公开更新源和文件；没有执行应用内下载、NSIS 安装或数据保留验收。";
  await writeFile(path.join(root, "report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(`报告：${path.join(root, "report.json")}`);
}
