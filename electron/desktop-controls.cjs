const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_SHORTCUT = "Ctrl+Alt+N";

function createDesktopControls({
  app,
  BrowserWindow,
  Menu,
  globalShortcut,
  screen,
  ipcMain,
  getMainWindow,
  startUrl,
  secureWindow,
  createTask,
  getWorkspace,
}) {
  let quickWindow;
  let quitting = false;
  let busy = false;
  let registered = "";
  let state = { shortcut: DEFAULT_SHORTCUT, enabled: true, registered: false, message: "" };
  const settingsPath = path.join(app.getPath("userData"), "desktop-controls.json");
  function validate(input) {
    if (
      !input ||
      typeof input.enabled !== "boolean" ||
      typeof input.shortcut !== "string" ||
      !/^(?:(?:Ctrl|Alt|Shift)\+){1,3}[A-Z0-9]$/.test(input.shortcut) ||
      new Set(input.shortcut.split("+")).size !== input.shortcut.split("+").length ||
      !/(Ctrl|Alt)\+/.test(input.shortcut)
    )
      throw new Error("请使用 Ctrl 或 Alt 搭配字母或数字，例如 Ctrl+Alt+N。");
    return { shortcut: input.shortcut, enabled: input.enabled };
  }
  try {
    state = { ...state, ...validate(JSON.parse(fs.readFileSync(settingsPath, "utf8"))) };
  } catch {
    /* First run uses defaults. */
  }

  function register(input, persist = false) {
    const next = validate(input);
    let acquired = false;
    if (next.enabled && registered !== next.shortcut) {
      try {
        acquired = globalShortcut.register(next.shortcut, showQuick);
      } catch {
        acquired = false;
      }
      if (!acquired) {
        state.message = "快捷键被占用或无法注册，请更换组合。菜单和托盘仍可快速新建。";
        return { ...state };
      }
    }
    try {
      if (persist) {
        fs.writeFileSync(`${settingsPath}.tmp`, JSON.stringify(next));
        fs.renameSync(`${settingsPath}.tmp`, settingsPath);
      }
    } catch (error) {
      if (acquired) globalShortcut.unregister(next.shortcut);
      throw error;
    }
    if (registered && (!next.enabled || registered !== next.shortcut)) globalShortcut.unregister(registered);
    registered = next.enabled ? next.shortcut : "";
    state = {
      ...next,
      registered: Boolean(registered),
      message: next.enabled ? "快捷键已启用" : "快捷键已关闭，可从菜单或托盘快速新建",
    };
    return { ...state };
  }

  function ensureQuick() {
    if (quickWindow && !quickWindow.isDestroyed()) return quickWindow;
    quickWindow = new BrowserWindow({
      width: 520,
      height: 340,
      minWidth: 440,
      minHeight: 300,
      show: false,
      title: "快速记录 · TaskFlow",
      backgroundColor: "#ffffff",
      autoHideMenuBar: true,
      maximizable: false,
      fullscreenable: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        additionalArguments: ["--taskflow-quick"],
      },
    });
    quickWindow.setMenu(null);
    secureWindow(quickWindow);
    quickWindow.on("close", (event) => {
      if (!quitting) {
        event.preventDefault();
        if (!busy) quickWindow.hide();
      }
    });
    quickWindow.on("focus", () => quickWindow.webContents.send("taskflow:quick:focus"));
    void quickWindow.loadURL(new URL("/quick-create/", startUrl).toString()).catch(() => {
      quickWindow?.destroy();
      quickWindow = undefined;
    });
    return quickWindow;
  }
  function showQuick() {
    if (quitting) return;
    const window = ensureQuick();
    if (!window.isVisible()) {
      const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
      const [width, height] = window.getSize();
      window.setPosition(
        Math.round(area.x + (area.width - width) / 2),
        Math.round(area.y + (area.height - height) / 3),
      );
    }
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
    window.webContents.send("taskflow:quick:focus");
  }
  function trusted(event) {
    const window = BrowserWindow.fromWebContents(event.sender);
    const expected = new URL(startUrl);
    const actual = new URL(event.senderFrame?.url || "about:blank");
    if (
      ![getMainWindow(), quickWindow].includes(window) ||
      event.senderFrame !== event.sender.mainFrame ||
      actual.protocol !== expected.protocol ||
      actual.host !== expected.host
    )
      throw new Error("此窗口没有桌面操作权限。");
    return window;
  }
  const menu = () =>
    Menu.buildFromTemplate([
      { label: "任务", submenu: [{ label: "快速新建任务", click: showQuick }] },
      {
        label: "编辑",
        submenu: [
          { role: "undo", label: "撤销" },
          { role: "redo", label: "重做" },
          { type: "separator" },
          { role: "cut", label: "剪切" },
          { role: "copy", label: "复制" },
          { role: "paste", label: "粘贴" },
          { role: "selectAll", label: "全选" },
        ],
      },
      {
        label: "视图",
        submenu: [
          { role: "zoomIn", label: "放大" },
          { role: "zoomOut", label: "缩小" },
          { role: "resetZoom", label: "实际大小" },
          { label: "隐藏主窗口", click: () => getMainWindow()?.hide() },
        ],
      },
      {
        label: "应用",
        submenu: [
          { label: "设置", click: () => getMainWindow()?.webContents.send("taskflow:shell:settings") },
          { label: "退出 TaskFlow", click: () => app.quit() },
        ],
      },
    ]);
  ipcMain.handle("taskflow:shell:menu", (event) => menu().popup({ window: trusted(event), x: 8, y: 40 }));
  ipcMain.handle("taskflow:shell:theme", (event, dark) => {
    const window = trusted(event);
    if (window === getMainWindow() && process.platform === "win32")
      window.setTitleBarOverlay({
        color: dark === true ? "#111318" : "#ffffff",
        symbolColor: dark === true ? "#f5f7fa" : "#171a20",
      });
  });
  ipcMain.handle("taskflow:quick:show", (event) => {
    trusted(event);
    showQuick();
  });
  ipcMain.handle("taskflow:quick:hide", (event) => {
    if (trusted(event) === quickWindow && !busy) quickWindow.hide();
  });
  ipcMain.handle("taskflow:shortcuts:get", (event) => {
    trusted(event);
    return { ...state };
  });
  ipcMain.handle("taskflow:shortcuts:set", (event, input) => {
    if (trusted(event) !== getMainWindow()) throw new Error("请在主窗口修改设置。");
    return register(input, true);
  });
  ipcMain.handle("taskflow:quick:create", async (event, input) => {
    if (trusted(event) !== quickWindow || busy) throw new Error("任务正在保存，请勿重复提交。");
    if (input?.accountId !== getWorkspace().accountId) throw new Error("工作区已切换，请重新打开快速记录后提交。");
    busy = true;
    try {
      const task = createTask(input);
      getMainWindow()?.webContents.send("taskflow:tasks:changed", { accountId: input.accountId });
      return task;
    } finally {
      busy = false;
    }
  });
  app.on("before-quit", () => {
    quitting = true;
  });
  app.on("will-quit", () => {
    if (registered) globalShortcut.unregister(registered);
  });
  register(state);
  ensureQuick();
  return { showQuick };
}

module.exports = { createDesktopControls };
