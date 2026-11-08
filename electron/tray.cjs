function createTrayController({ app, Tray, Menu, nativeImage, iconPath, getWindow }) {
  const icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) throw new Error("无法读取 TaskFlow 托盘图标。");
  const tray = new Tray(icon);
  let quitting = false;
  let destroyed = false;
  const currentWindow = () => {
    const window = getWindow();
    return !quitting && !destroyed && window && !window.isDestroyed() ? window : null;
  };
  const show = () => {
    const window = currentWindow();
    if (!window) return false;
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
    return true;
  };
  const hide = () => {
    const window = currentWindow();
    if (!window) return false;
    window.hide();
    return true;
  };
  const beforeQuit = () => {
    quitting = true;
  };
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    app.removeListener("before-quit", beforeQuit);
    app.removeListener("will-quit", destroy);
    tray.removeAllListeners();
    tray.destroy();
  };
  try {
    tray.setToolTip("TaskFlow");
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { id: "show", label: "显示 TaskFlow", click: show },
        { id: "hide", label: "隐藏窗口", click: hide },
        { type: "separator" },
        {
          id: "quit",
          label: "退出 TaskFlow",
          click: () => {
            beforeQuit();
            app.quit();
          },
        },
      ]),
    );
    tray.on("click", show);
    tray.on("double-click", show);
    app.on("before-quit", beforeQuit);
    app.once("will-quit", destroy);
  } catch (error) {
    destroy();
    throw error;
  }
  return { show, hide, destroy };
}

module.exports = { createTrayController };
