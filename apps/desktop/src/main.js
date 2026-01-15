const path = require("path");
const { app, BrowserWindow, shell } = require("electron");
const { spawn } = require("child_process");

let mainWindow;
let apiProcess;

const isDev = !app.isPackaged || process.argv.includes("--dev");

function getApiEntryPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "api", "server.js");
  }
  return path.join(__dirname, "..", "..", "api", "server.js");
}

function startApi() {
  if (process.env.START_LOCAL_API === "0") {
    return;
  }
  if (apiProcess) return;
  const apiEntry = getApiEntryPath();
  const nodePath = app.isPackaged
    ? path.join(process.resourcesPath, "node_modules")
    : path.join(__dirname, "..", "..", "..", "node_modules");

  apiProcess = spawn(process.execPath, [apiEntry], {
    env: {
      ...process.env,
      PORT: process.env.API_PORT || "3001",
      NODE_PATH: nodePath,
    },
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

  if (isDev) {
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

app.whenReady().then(() => {
  startApi();
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
