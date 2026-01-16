const { contextBridge } = require("electron");

const apiPort = process.env.ESTOQUE_API_PORT || "3001";
const apiBaseUrl = process.env.ESTOQUE_API_BASE_URL || `http://localhost:${apiPort}`;

contextBridge.exposeInMainWorld("__APP_CONFIG__", { apiBaseUrl, origin: "desktop" });
contextBridge.exposeInMainWorld("estoque", { apiBaseUrl, origin: "desktop" });
