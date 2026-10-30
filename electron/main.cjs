const { app, BrowserWindow, net, protocol, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const { closeDatabase, initializeDatabase } = require("./database.cjs");
const { registerIpcHandlers } = require("./ipc.cjs");

const DEV_URL = "http://127.0.0.1:3000";
const PRODUCTION_URL = "https://www.uta4k.top/";
const LOCAL_APP_URL = "app://taskflow/";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
]);

let mainWindow;

function getConfiguredStartUrl() {
  const configuredUrl = process.env.ELECTRON_START_URL || process.env.TASKFLOW_WEB_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  if (!app.isPackaged) {
    return DEV_URL;
  }

  return fs.existsSync(getDesktopWebRoot()) ? LOCAL_APP_URL : PRODUCTION_URL;
}

function isAllowedNavigation(targetUrl, startUrl) {
  try {
    const target = new URL(targetUrl);
    const start = new URL(startUrl);

    const supportedProtocol = target.protocol === "http:" || target.protocol === "https:" || target.protocol === "app:";
    return supportedProtocol && target.protocol === start.protocol && target.host === start.host;
  } catch {
    return false;
  }
}

function getDesktopWebRoot() {
  return path.join(__dirname, "..", "desktop-web", "out");
}

async function registerLocalAppProtocol() {
  await protocol.handle("app", async (request) => {
    let requestedPath;
    try {
      const requestUrl = new URL(request.url);
      requestedPath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");
    } catch {
      return new Response("Bad Request", { status: 400 });
    }
    const root = path.resolve(getDesktopWebRoot());
    const routePath = requestedPath || "index.html";
    const candidate = resolveStaticPath(root, routePath);
    const fallback = candidate ?? path.join(root, "404.html");

    if (!fs.existsSync(fallback)) {
      return new Response("Not Found", { status: 404 });
    }

    return net.fetch(pathToFileURL(fallback).toString());
  });
}

function resolveStaticPath(root, routePath) {
  const normalized = routePath.replaceAll("/", path.sep);
  const direct = path.resolve(root, normalized);
  if (!isWithin(root, direct)) return null;
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;

  const route = path.extname(direct) ? direct : path.join(direct, "index.html");
  if (isWithin(root, route) && fs.existsSync(route) && fs.statSync(route).isFile()) return route;

  // Static export contains one placeholder for the dynamic task route. The
  // client reads the actual pathname and then loads that task from SQLite.
  if (routePath.startsWith("tasks/") && !routePath.startsWith("tasks/__task__")) {
    const dynamicFallback = path.join(root, "tasks", "__task__", "index.html");
    if (fs.existsSync(dynamicFallback)) return dynamicFallback;
  }

  return null;
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function buildStatusPage(title, message) {
  return `<!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>TaskFlow 桌面端</title>
        <style>
          :root { color-scheme: light; font-family: system-ui, sans-serif; }
          body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f5f7fb; color: #18212f; }
          main { max-width: 560px; padding: 32px; margin: 24px; border-radius: 16px; background: white; box-shadow: 0 12px 40px rgb(24 33 47 / 10%); }
          code { padding: 2px 6px; border-radius: 4px; background: #eef1f6; }
        </style>
      </head>
      <body>
        <main>
          <h1>${title}</h1>
          <p>${message}</p>
        </main>
      </body>
    </html>`;
}

async function createMainWindow() {
  const startUrl = getConfiguredStartUrl();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: "#f5f7fb",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const target = new URL(url);
      if (target.protocol === "http:" || target.protocol === "https:") {
        void shell.openExternal(target.toString());
      }
    } catch {
      // Ignore malformed or unsupported URLs.
    }

    return { action: "deny" };
  });

  if (startUrl) {
    mainWindow.webContents.on("will-navigate", (event, url) => {
      if (!isAllowedNavigation(url, startUrl)) {
        event.preventDefault();
      }
    });

    try {
      await mainWindow.loadURL(startUrl);
    } catch {
      await mainWindow.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(
          buildStatusPage("TaskFlow 桌面端", "暂时无法连接 TaskFlow Web 服务，请检查网络后重新启动应用。"),
        )}`,
      );
    }
  } else {
    await mainWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(
        buildStatusPage("TaskFlow 桌面端", "尚未配置 TaskFlow Web 地址。"),
      )}`,
    );
  }

  mainWindow.on("closed", () => {
    mainWindow = undefined;
  });
}

app.whenReady().then(async () => {
  registerIpcHandlers();
  await registerLocalAppProtocol();

  try {
    await initializeDatabase();
  } catch (error) {
    console.error("[TaskFlow] 本地数据库初始化失败。", error);
  }

  await createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  closeDatabase();
});
