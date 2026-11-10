const { app, BrowserWindow } = require("electron");
if (!process.env.TASKFLOW_SHORTCUT_PROBE_PROFILE) throw new Error("An isolated profile is required");
app.setPath("userData", process.env.TASKFLOW_SHORTCUT_PROBE_PROFILE);
app.whenReady().then(async () => {
  const window = new BrowserWindow({ width: 420, height: 200 });
  await window.loadURL("data:text/html,<title>TaskFlow shortcut probe</title><h1>Shortcut test</h1>");
  window.show();
  window.focus();
});
app.on("window-all-closed", () => app.quit());
