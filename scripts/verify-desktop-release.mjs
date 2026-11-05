import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { parse } from "yaml";

const pkg = JSON.parse(await readFile("package.json", "utf8"));
assert.match(pkg.version, /^\d+\.\d+\.\d+-beta\.\d+$/);
const root = path.resolve(process.argv[2] ?? "dist/electron");
const name = `TaskFlow-Setup-${pkg.version}-win-x64.exe`;
const metadata = parse(await readFile(path.join(root, "beta.yml"), "utf8"));
assert.equal(metadata.version, pkg.version);
assert.equal(metadata.path, name);
assert.equal(metadata.files.length, 1);
assert.equal(metadata.files[0].url, name);
await assert.rejects(() => access(path.join(root, "latest.yml")), "beta 目录不应包含正式通道元数据");
async function digest(file, algorithm, encoding = "hex") {
  const hash = createHash(algorithm);
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest(encoding);
}
const exe = path.join(root, name);
const authenticode =
  process.platform === "win32"
    ? execFileSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          "Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Security/Microsoft.PowerShell.Security.psd1'); (Get-AuthenticodeSignature -LiteralPath $env:TASKFLOW_CHECK_INSTALLER).Status.ToString()",
        ],
        { env: { ...process.env, TASKFLOW_CHECK_INSTALLER: exe }, encoding: "utf8", windowsHide: true },
      ).trim()
    : "not-inspected";
if (process.platform === "win32")
  assert.ok(["Valid", "NotSigned"].includes(authenticode), `安装包签名状态异常：${authenticode}`);
assert.equal((await stat(exe)).size, metadata.files[0].size);
assert.equal(await digest(exe, "sha512", "base64"), metadata.files[0].sha512);
assert.equal(metadata.sha512, metadata.files[0].sha512);
assert.ok((await stat(`${exe}.blockmap`)).size > 0);
const settings = parse(await readFile(path.join(root, "win-unpacked/resources/app-update.yml"), "utf8"));
const require = createRequire(import.meta.url);
const builderRequire = createRequire(require.resolve("electron-builder/package.json"));
const archiveRequire = createRequire(builderRequire.resolve("app-builder-lib/package.json"));
const asar = archiveRequire("@electron/asar");
const archive = path.join(root, "win-unpacked/resources/app.asar");
const bundled = JSON.parse(asar.extractFile(archive, "package.json").toString());
assert.equal(bundled.version, pkg.version);
assert.equal(bundled.main, "electron/main.cjs");
assert.equal(Object.hasOwn(bundled, "taskflowUpdateTest"), false);
assert.equal(
  asar.listPackage(archive).some((file) => /update-test-main|\.test\.cjs$/.test(file)),
  false,
  "正式包不得包含测试入口或单元测试",
);
assert.equal(settings.provider, "github");
assert.equal(settings.owner, "Uonlra");
assert.equal(settings.repo, "TaskFlow");
assert.equal(settings.channel, "beta");
const files = await Promise.all(
  [name, `${name}.blockmap`, "beta.yml"].map(async (file) => ({
    file,
    size: (await stat(path.join(root, file))).size,
    sha256: await digest(path.join(root, file), "sha256"),
  })),
);
await writeFile(
  path.join(root, "SHA256SUMS.txt"),
  files.map((file) => `${file.sha256}  ${file.file}`).join("\n") + "\n",
);
await writeFile(
  path.join(root, "release-manifest.json"),
  JSON.stringify(
    {
      version: pkg.version,
      tag: `v${pkg.version}`,
      channel: "beta",
      sourceCommit: process.env.GITHUB_SHA ?? execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      authenticode,
      files,
    },
    null,
    2,
  ) + "\n",
);
console.log(`PASS: ${pkg.version} beta 元数据、GitHub 配置、安装包 SHA-512、blockmap 和 SHA-256 清单。`);
