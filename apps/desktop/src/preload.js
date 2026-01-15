const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("estoque", {});
