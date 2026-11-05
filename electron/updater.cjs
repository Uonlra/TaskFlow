function createUpdateController({ app, updater, notify = () => {}, platform = process.platform }) {
  const supported = app.isPackaged && platform === "win32";
  const channel = /-beta(?:\.|$)/.test(app.getVersion()) ? "beta" : "latest";
  let state = {
    phase: supported ? "idle" : "disabled",
    currentVersion: app.getVersion(),
    channel,
    version: null,
    percent: 0,
    message: supported ? "" : "请使用 Windows 安装版检查更新。",
  };
  let checkPromise;
  let downloadPromise;
  const publish = (patch) => {
    state = { ...state, ...patch };
    notify({ ...state });
  };
  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;
  updater.channel = channel;
  // The channel setter enables downgrades; reset explicitly.
  updater.allowDowngrade = false;
  updater.allowPrerelease = channel === "beta";
  updater.on("checking-for-update", () => publish({ phase: "checking", message: "正在检查更新…" }));
  updater.on("update-available", (info) =>
    publish({ phase: "available", version: info.version, percent: 0, message: "发现新版本。" }),
  );
  updater.on("update-not-available", () =>
    publish({ phase: "not-available", version: null, message: "当前已是此通道的最新版本。" }),
  );
  updater.on("download-progress", (progress) =>
    publish({
      phase: "downloading",
      percent: Math.max(0, Math.min(100, progress.percent || 0)),
      message: "正在下载更新…",
    }),
  );
  updater.on("update-downloaded", (info) =>
    publish({ phase: "downloaded", version: info.version, percent: 100, message: "更新已下载，可以重启安装。" }),
  );
  updater.on("error", () => publish({ phase: "error", message: "更新暂不可用，请检查网络后重试。" }));
  return {
    getState: () => ({ ...state }),
    check() {
      if (!supported || ["downloading", "downloaded", "installing"].includes(state.phase))
        return Promise.resolve({ ...state });
      if (checkPromise) return checkPromise;
      publish({ phase: "checking", message: "正在检查更新…" });
      checkPromise = Promise.resolve()
        .then(() => updater.checkForUpdates())
        .catch(() => publish({ phase: "error", message: "更新暂不可用，请检查网络后重试。" }))
        .then(() => ({ ...state }))
        .finally(() => {
          checkPromise = undefined;
        });
      return checkPromise;
    },
    download() {
      if (downloadPromise) return downloadPromise;
      if (!supported || state.phase !== "available") return Promise.resolve({ ...state });
      publish({ phase: "downloading", percent: 0, message: "正在下载更新…" });
      downloadPromise = Promise.resolve()
        .then(() => updater.downloadUpdate())
        .catch(() => publish({ phase: "error", message: "下载失败，请检查网络后重新检查更新。" }))
        .then(() => ({ ...state }))
        .finally(() => {
          downloadPromise = undefined;
        });
      return downloadPromise;
    },
    install() {
      if (!supported || state.phase !== "downloaded") throw new Error("请先完成更新下载。");
      publish({ phase: "installing", message: "正在重启并安装更新…" });
      updater.quitAndInstall(true, true);
    },
  };
}
module.exports = { createUpdateController };
