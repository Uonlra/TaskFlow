// Native tray component smoke fixture; never included by release build files.
const { app, BrowserWindow, Tray, Menu, nativeImage } = require("electron");
const path = require("node:path");
const { createTrayController } = require("../../electron/tray.cjs");
if (app.isPackaged || !process.env.TASKFLOW_TRAY_TEST_PROFILE) throw new Error("仅供隔离托盘验收使用");
app.setName("TaskFlow Tray Smoke");
app.setPath("userData", process.env.TASKFLOW_TRAY_TEST_PROFILE);
app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 480,
    height: 300,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  let tray, menu;
  const controller = createTrayController({
    app,
    Tray: function (icon) {
      tray = new Tray(icon);
      return tray;
    },
    Menu: {
      buildFromTemplate: (items) => {
        menu = Menu.buildFromTemplate(items);
        return menu;
      },
    },
    nativeImage,
    iconPath: path.resolve(__dirname, "../../electron/assets/tray.ico"),
    getWindow: () => window,
  });
  globalThis.taskflowTraySmoke = { window, tray, menu, controller };
  await window.loadURL("data:text/html;charset=utf-8,<title>TaskFlow Tray Smoke</title><h1>TaskFlow tray smoke</h1>");
});
app.on("window-all-closed", () => app.quit());
