// Included only by the isolated updater smoke build, never by release builds.
const { app } = require("electron");
const { autoUpdater } = require("electron-updater");
if (!/^TaskFlow Update Check \d+$/.test(app.getName())) throw new Error("仅供隔离更新验收使用");
// Survives installer relaunch without environment or external config files.
const config = require("../../package.json").taskflowUpdateTest;
const url = new URL(config.feed);
if (url.protocol !== "http:" || url.hostname !== "127.0.0.1") throw new Error("验收服务器必须为本机回环地址");
if (!/^\d+$/.test(config.port ?? "")) throw new Error("缺少验收调试端口");
app.commandLine.appendSwitch("remote-debugging-port", config.port);
process.env.TASKFLOW_DISABLE_UPDATE_CHECK = "1";
app.commandLine.appendSwitch("proxy-server", "http://127.0.0.1:1");
app.commandLine.appendSwitch("proxy-bypass-list", "127.0.0.1;localhost");
autoUpdater.setFeedURL({ provider: "generic", url: url.toString(), useMultipleRangeRequest: false });
require("../../electron/main.cjs");
