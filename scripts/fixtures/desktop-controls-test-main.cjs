const { app } = require("electron");
const path = require("node:path");
if (!process.env.TASKFLOW_CONTROLS_TEST_PROFILE) throw new Error("An isolated profile is required");
app.setPath("userData", path.resolve(process.env.TASKFLOW_CONTROLS_TEST_PROFILE));
require("../../electron/main.cjs");
