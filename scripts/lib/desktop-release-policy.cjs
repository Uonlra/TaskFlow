const assert = require("node:assert/strict");

function getReleasePolicy(version, requestedTag = `v${version}`) {
  const number = "(0|[1-9]\\d*)";
  const match = new RegExp(`^${number}\\.${number}\\.${number}(?:-beta\\.${number})?$`).exec(version);
  assert.ok(
    match &&
      match
        .slice(1)
        .filter(Boolean)
        .every((part) => Number.isSafeInteger(Number(part))),
    "Only canonical x.y.z or x.y.z-beta.n versions are supported",
  );
  assert.equal(requestedTag, `v${version}`, "Release tag must match package.json version");
  const prerelease = match[4] !== undefined;
  const channel = prerelease ? "beta" : "latest";
  return {
    version,
    tag: requestedTag,
    channel,
    prerelease,
    metadataFile: `${channel}.yml`,
    oppositeMetadataFile: prerelease ? "latest.yml" : "beta.yml",
  };
}

function createDesktopBuildConfig(pkg) {
  const policy = getReleasePolicy(pkg.version);
  assert.ok(
    !pkg.build.extraMetadata?.version || pkg.build.extraMetadata.version === pkg.version,
    "extraMetadata.version must match package.json",
  );
  return {
    ...pkg.build,
    generateUpdatesFilesForAllChannels: false,
    publish: { ...pkg.build.publish, channel: policy.channel, releaseType: "draft" },
  };
}

function releaseAssetNames(policy) {
  const installer = `TaskFlow-Setup-${policy.version}-win-x64.exe`;
  return [installer, `${installer}.blockmap`, policy.metadataFile, "SHA256SUMS.txt", "release-manifest.json"];
}

function assertPublishedRelease(release, policy) {
  assert.equal(release.tag_name, policy.tag);
  assert.equal(release.draft, false);
  assert.equal(release.prerelease, policy.prerelease, "Release prerelease status must match its version");
  assert.deepEqual(
    release.assets.map((asset) => asset.name).sort(),
    releaseAssetNames(policy).sort(),
    "Release must contain exactly the five expected assets for its channel",
  );
}

module.exports = { getReleasePolicy, createDesktopBuildConfig, releaseAssetNames, assertPublishedRelease };
