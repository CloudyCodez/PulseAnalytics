const { contextBridge } = require("electron");

// Expose minimal safe API to renderer if needed in future
contextBridge.exposeInMainWorld("pulse", {
  version: process.env.npm_package_version || "0.1.0",
});
