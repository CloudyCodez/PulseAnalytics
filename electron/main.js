const { app, BrowserWindow, Tray, Menu, nativeImage, shell, utilityProcess } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");
const fs = require("fs");
const os = require("os");

// ─── Config ───────────────────────────────────────────────────────────────────
const DEV = process.env.ELECTRON_DEV === "true";
const DEV_PORT = parseInt(process.env.ELECTRON_DEV_PORT || "3001", 10);
const PREFERRED_PORT = 3000;
let activePort = PREFERRED_PORT;
let nextProcess = null;   // utilityProcess handle
let ollamaProcess = null; // child_process handle
let mainWindow = null;
let loadingWindow = null;
let tray = null;
let appQuitting = false;

// ─── CRITICAL: Single-instance lock ──────────────────────────────────────────
// Prevents the spawn loop: without this, every new process instance would
// start its own copy of the server and open another window.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  // We are the second instance — hand focus to the first and die
  app.quit();
  process.exit(0);
}
app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// ─── Find an available port ────────────────────────────────────────────────────
function findAvailablePort(startPort) {
  return new Promise((resolve) => {
    const net = require("net");
    const server = net.createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on("error", () => resolve(findAvailablePort(startPort + 1)));
  });
}

// ─── Wait for Next.js to be ready ─────────────────────────────────────────────
function waitForNextJS(port, retries = 60) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      const req = http.get(`http://localhost:${port}`, () => resolve());
      req.on("error", () => {
        attempts++;
        if (attempts >= retries) {
          reject(new Error(`Next.js not ready on port ${port} after ${retries}s`));
        } else {
          setTimeout(check, 1000);
        }
      });
      req.end();
    };
    check();
  });
}

// ─── Find Ollama binary ────────────────────────────────────────────────────────
function findOllamaBinary() {
  const candidates = process.platform === "win32"
    ? [
        path.join(os.homedir(), "AppData", "Local", "Programs", "Ollama", "ollama.exe"),
        path.join(os.homedir(), "AppData", "Local", "Ollama", "ollama.exe"),
        "C:\\Program Files\\Ollama\\ollama.exe",
      ]
    : ["/usr/local/bin/ollama", "/usr/bin/ollama"];

  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {}
  }
  return process.platform === "win32" ? "ollama.exe" : "ollama";
}

// ─── Start Ollama ──────────────────────────────────────────────────────────────
function startOllama() {
  return new Promise((resolve) => {
    const req = http.get("http://localhost:11434", () => {
      console.log("[Pulse] Ollama already running.");
      resolve();
    });
    req.on("error", () => {
      const binary = findOllamaBinary();
      console.log(`[Pulse] Starting Ollama: ${binary}`);
      ollamaProcess = spawn(binary, ["serve"], {
        detached: false,
        stdio: "ignore",
        shell: false,
        env: { ...process.env },
      });
      ollamaProcess.on("error", (err) => {
        console.warn("[Pulse] Ollama failed to start:", err.message);
        resolve();
      });
      setTimeout(resolve, 4000);
    });
    req.end();
  });
}

// ─── Start Next.js via Electron's utilityProcess ──────────────────────────────
// utilityProcess runs Node.js scripts INSIDE Electron's own Node runtime —
// this is the correct way to run server.js without spawning the .exe itself,
// which would cause the infinite spawn loop.
function startNextJS(port) {
  return new Promise((resolve, reject) => {
    const standalonePath = path.join(process.resourcesPath, "standalone");
    const serverScript = path.join(standalonePath, "server.js");

    if (!fs.existsSync(serverScript)) {
      return reject(new Error(`server.js not found at: ${serverScript}`));
    }

    console.log(`[Pulse] Starting Next.js via utilityProcess on port ${port}`);
    console.log(`[Pulse] Standalone path: ${standalonePath}`);

    nextProcess = utilityProcess.fork(serverScript, [], {
      cwd: standalonePath,
      env: {
        ...process.env,
        PORT: String(port),
        HOSTNAME: "127.0.0.1",
        NEXT_TELEMETRY_DISABLED: "1",
        NEXT_PUBLIC_MOCK_MODE: process.env.NEXT_PUBLIC_MOCK_MODE || "false",
      },
      stdio: "pipe",
    });

    let resolved = false;

    if (nextProcess.stdout) {
      nextProcess.stdout.on("data", (data) => {
        const out = data.toString();
        console.log("[Next]", out.trim());
        if (!resolved && (
          out.includes("ready") ||
          out.includes("started server") ||
          out.includes("listening")
        )) {
          resolved = true;
          resolve();
        }
      });
    }

    if (nextProcess.stderr) {
      nextProcess.stderr.on("data", (data) => {
        const msg = data.toString().trim();
        if (msg) console.error("[Next:err]", msg);
      });
    }

    nextProcess.on("exit", (code) => {
      console.log(`[Next] Process exited with code: ${code}`);
      if (!resolved) reject(new Error(`Next.js exited early with code ${code}`));
    });

    // Safety timeout — show the window even if we miss the "ready" message
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.log("[Pulse] Next.js timeout — proceeding anyway");
        resolve();
      }
    }, 25000);
  });
}

// ─── Create loading window ─────────────────────────────────────────────────────
function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 420,
    height: 280,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    webPreferences: { nodeIntegration: false },
  });
  loadingWindow.loadFile(path.join(__dirname, "loading.html"));
}

// ─── Load icon safely ─────────────────────────────────────────────────────────
function loadIcon() {
  try {
    const iconPath = path.join(__dirname, "icon.ico");
    if (fs.existsSync(iconPath)) return nativeImage.createFromPath(iconPath);
  } catch (e) {
    console.warn("[Pulse] Could not load icon:", e.message);
  }
  return null;
}

// ─── Create main window ────────────────────────────────────────────────────────
function createMainWindow(port) {
  const icon = loadIcon();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: "Pulse",
    backgroundColor: "#0a0f1e",
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://localhost:${port}/dashboard`);

  mainWindow.once("ready-to-show", () => {
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      loadingWindow.close();
      loadingWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on("close", (e) => {
    if (!appQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

// ─── System tray ──────────────────────────────────────────────────────────────
function createTray() {
  const icon = loadIcon();
  const trayIcon = icon
    ? icon.resize({ width: 16, height: 16 })
    : nativeImage.createEmpty();

  tray = new Tray(trayIcon);
  tray.setToolTip("Pulse Analytics");

  const menu = Menu.buildFromTemplate([
    {
      label: "Open Pulse",
      click: () => {
        if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
      },
    },
    { type: "separator" },
    {
      label: "Quit Pulse",
      click: () => { appQuitting = true; app.quit(); },
    },
  ]);

  tray.setContextMenu(menu);
  tray.on("double-click", () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });
}

// ─── Cleanup on quit ──────────────────────────────────────────────────────────
function cleanup() {
  appQuitting = true;
  if (nextProcess) {
    try { nextProcess.kill(); } catch (e) {}
  }
  if (ollamaProcess && !ollamaProcess.killed) {
    try { ollamaProcess.kill(); } catch (e) {}
  }
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  createLoadingWindow();

  try {
    if (DEV) {
      console.log(`[Pulse] DEV mode — connecting to Next.js on port ${DEV_PORT}`);
      activePort = DEV_PORT;
      await startOllama();
      await waitForNextJS(activePort);
    } else {
      activePort = await findAvailablePort(PREFERRED_PORT);
      console.log(`[Pulse] Using port ${activePort}`);
      await startOllama();
      await startNextJS(activePort);
      await waitForNextJS(activePort);
    }

    createMainWindow(activePort);
    createTray();

  } catch (err) {
    console.error("[Pulse] Startup error:", err);
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      loadingWindow.webContents.executeJavaScript(
        `document.getElementById('status').textContent = 'Startup failed: ${String(err.message).replace(/['"]/g, "")}. Try restarting Pulse.'`
      ).catch(() => {});
    }
  }
});

app.on("before-quit", cleanup);
app.on("will-quit", cleanup);

app.on("window-all-closed", () => {
  // Keep alive via tray on all platforms
});

app.on("activate", () => {
  if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
});
