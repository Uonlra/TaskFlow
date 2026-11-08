import { appendFile, access, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import policyModule from "./lib/desktop-release-policy.cjs";

const pkg = JSON.parse(await readFile("package.json", "utf8"));
const policy = policyModule.getReleasePolicy(pkg.version, process.env.REQUESTED_TAG ?? "");
const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const tagCommit = execFileSync("git", ["rev-parse", `${policy.tag}^{commit}`], { encoding: "utf8" }).trim();
assert.equal(tagCommit, head, "Release tag must point at the checked-out commit");
if (process.env.GITHUB_SHA) assert.equal(head, process.env.GITHUB_SHA, "Workflow source must match checkout");
assert.ok(
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT && process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  "Configure repository Actions variables NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID",
);
await access(`docs/releases/${policy.tag}.md`);
if (process.env.GITHUB_OUTPUT) {
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `version=${policy.version}\ntag=${policy.tag}\nchannel=${policy.channel}\nmetadata=${policy.metadataFile}\nprerelease=${policy.prerelease}\n`,
  );
}
console.log(
  `Validated ${policy.tag}: ${policy.channel} channel, draft ${policy.prerelease ? "prerelease" : "stable release"}`,
);
