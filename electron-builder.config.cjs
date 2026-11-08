const { createDesktopBuildConfig } = require("./scripts/lib/desktop-release-policy.cjs");
module.exports = createDesktopBuildConfig(require("./package.json"));
