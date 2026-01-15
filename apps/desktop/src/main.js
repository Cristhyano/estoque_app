const path = require("path");
const net = require("net");
const { app, BrowserWindow, shell } = require("electron");
const { spawn } = require("child_process");

let mainWindow;
let apiProcess;

const useDevServer = process.argv.includes("--dev") && process.env.USE_VITE_DEV_SERVER !== "0";

function resolveApiPort() {
  const raw = Number(process.env.ESTOQUE_API_PORT || 3001);
  return Number.isFinite(raw) && raw > 0 ? raw : 3001;
}

function resolveApiBaseUrl(apiPort) {
  return (
    process.env.ESTOQUE_API_BASE_URL ||
    (process.env.ESTOQUE_API_MODE === "remote"
      ? "https://comthy.com/estoque/api"
      : `http://localhost:${apiPort}`)
  );
}

function shouldStartLocalApi(apiUrl) {
  return apiUrl.startsWith("http://localhost");
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

function getApiEntryPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "api", "server.js");
  }
  return path.join(__dirname, "..", "..", "api", "server.js");
}

async function startApi() {
  const apiPort = resolveApiPort();
  const apiBaseUrl = resolveApiBaseUrl(apiPort);
  process.env.ESTOQUE_API_PORT = String(apiPort);
  process.env.ESTOQUE_API_BASE_URL = apiBaseUrl;

  if (!shouldStartLocalApi(apiBaseUrl)) {
    return;
  }
  if (process.env.START_LOCAL_API === "0") {
    return;
  }
  if (apiProcess) return;

  const portFree = await isPortFree(apiPort);
  if (!portFree) {
    return;
  }

  const apiEntry = getApiEntryPath();
  const env = {
    ...process.env,
    PORT: String(apiPort),
    ELECTRON_RUN_AS_NODE: "1",
  };
  if (app.isPackaged) {
    env.ESTOQUE_DATA_DIR = path.join(app.getPath("userData"), "data");
  }

  apiProcess = spawn(process.execPath, [apiEntry], {
    env,
    stdio: "ignore",
    windowsHide: true,
  });

  apiProcess.on("exit", () => {
    apiProcess = null;
  });
}

function stopApi() {
  if (!apiProcess) return;
  apiProcess.kill();
  apiProcess = null;
}

function getProdIndexPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "dist", "index.html");
  }
  return path.join(__dirname, "..", "..", "web", "dist", "index.html");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  if (useDevServer) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(getProdIndexPath());
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(async () => {
  await startApi();
  createWindow();
});

app.on("window-all-closed", () => {
  stopApi();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("before-quit", () => {
  stopApi();
});
