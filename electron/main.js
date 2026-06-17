const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  shell,
  utilityProcess,
  ipcMain,
} = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");
const https = require("https");
const net = require("net");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");
const url = require("url");

// ─── Config ───────────────────────────────────────────────────────────────────
const DEV = process.env.ELECTRON_DEV === "true";
const DEV_PORT = parseInt(process.env.ELECTRON_DEV_PORT || "3001", 10);
const PREFERRED_PORT = 3000;
let activePort = PREFERRED_PORT;

// ─── Process handles ─────────────────────────────────────────────────────────
let nextProcess = null;
let ollamaProcess = null;

// ─── Windows ──────────────────────────────────────────────────────────────────
let mainWindow = null;
let loadingWindow = null;
let setupWindow = null;
let tray = null;
let appQuitting = false;

// ─── On-disk config store ─────────────────────────────────────────────────────
// Stored at %APPDATA%/Pulse/config.json (Windows) or ~/Library/... (mac)
const CONFIG_PATH = path.join(app.getPath("userData"), "config.json");

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    }
  } catch (e) {
    console.warn("[Pulse] Could not read config:", e.message);
  }
  return {};
}

function writeConfig(data) {
  try {
    const existing = readConfig();
    const merged = deepMerge(existing, data);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), "utf8");
    return merged;
  } catch (e) {
    console.error("[Pulse] Could not write config:", e.message);
    throw e;
  }
}

function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      out[key] = deepMerge(out[key] || {}, source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

function isSetupComplete() {
  const cfg = readConfig();
  return cfg.setupComplete === true;
}

// ─── CRITICAL: Single-instance lock ──────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}
app.on("second-instance", () => {
  const win = mainWindow || setupWindow;
  if (win) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }
});

// ─── Port utilities ───────────────────────────────────────────────────────────
function findAvailablePort(startPort) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on("error", () => resolve(findAvailablePort(startPort + 1)));
  });
}

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

// ─── Ollama ───────────────────────────────────────────────────────────────────
function findOllamaBinary() {
  const candidates =
    process.platform === "win32"
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

// ─── Next.js via utilityProcess ───────────────────────────────────────────────
function startNextJS(port) {
  return new Promise((resolve, reject) => {
    const standalonePath = path.join(process.resourcesPath, "standalone");
    const serverScript = path.join(standalonePath, "server.js");

    if (!fs.existsSync(serverScript)) {
      return reject(new Error(`server.js not found at: ${serverScript}`));
    }

    console.log(`[Pulse] Starting Next.js via utilityProcess on port ${port}`);

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
        if (!resolved && (out.includes("ready") || out.includes("started server") || out.includes("listening"))) {
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
      console.log(`[Next] exited: ${code}`);
      if (!resolved) reject(new Error(`Next.js exited with code ${code}`));
    });
    setTimeout(() => {
      if (!resolved) { resolved = true; resolve(); }
    }, 25000);
  });
}

// ─── Icon helper ──────────────────────────────────────────────────────────────
function loadIcon() {
  try {
    const iconPath = path.join(__dirname, "icon.ico");
    if (fs.existsSync(iconPath)) return nativeImage.createFromPath(iconPath);
  } catch (e) {
    console.warn("[Pulse] Could not load icon:", e.message);
  }
  return null;
}

// ─── Loading window ───────────────────────────────────────────────────────────
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

function closeLoading() {
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    loadingWindow.close();
    loadingWindow = null;
  }
}

// ─── Setup wizard window ──────────────────────────────────────────────────────
function createSetupWindow() {
  const icon = loadIcon();
  setupWindow = new BrowserWindow({
    width: 820,
    height: 560,
    minWidth: 720,
    minHeight: 480,
    resizable: true,
    center: true,
    show: false,
    title: "Pulse Setup",
    backgroundColor: "#0a0f1e",
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  setupWindow.loadFile(path.join(__dirname, "setup.html"));

  setupWindow.once("ready-to-show", () => {
    closeLoading();
    setupWindow.show();
    setupWindow.focus();
  });

  // Prevent closing the setup window from quitting the app
  setupWindow.on("close", (e) => {
    if (!appQuitting) {
      // Only allow close if main window is open (setup was completed)
      if (!mainWindow || mainWindow.isDestroyed()) {
        e.preventDefault(); // Can't exit without completing or quitting via menu
      }
    }
  });
}

// ─── Main window ──────────────────────────────────────────────────────────────
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
    closeLoading();
    // Close setup window if it's still open
    if (setupWindow && !setupWindow.isDestroyed()) {
      setupWindow.close();
      setupWindow = null;
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

  mainWindow.webContents.setWindowOpenHandler(({ url: openUrl }) => {
    shell.openExternal(openUrl);
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
        const win = mainWindow || setupWindow;
        if (win) { win.show(); win.focus(); }
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
    const win = mainWindow || setupWindow;
    if (win) { win.show(); win.focus(); }
  });
}

// ─── OAuth redirect-catcher ───────────────────────────────────────────────────
// Opens the system browser at the provider's auth URL.
// Spins up a temporary localhost HTTP server to catch the OAuth redirect.
// The redirect URI registered with Google/Meta must match this local address.

const OAUTH_REDIRECT_PORT = 9988; // fixed port; register this in your OAuth app console
const OAUTH_REDIRECT_URI = `http://localhost:${OAUTH_REDIRECT_PORT}/callback`;

function buildGoogleAuthUrl(state) {
  // Reads GOOGLE_CLIENT_ID from .env.local / bundled env at build time
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const scopes = [
    "https://www.googleapis.com/auth/adwords",
    "https://www.googleapis.com/auth/analytics.readonly",
    "openid",
    "email",
  ].join(" ");

  const params = new url.URLSearchParams({
    client_id: clientId,
    redirect_uri: OAUTH_REDIRECT_URI,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

function buildMetaAuthUrl(state) {
  const appId = process.env.META_APP_ID || "";
  const scopes = "ads_read,ads_management,read_insights,email";
  const params = new url.URLSearchParams({
    client_id: appId,
    redirect_uri: OAUTH_REDIRECT_URI,
    response_type: "code",
    scope: scopes,
    state,
  });
  return `https://www.facebook.com/v20.0/dialog/oauth?${params}`;
}

/**
 * Exchange authorization code with the Next.js app's own API route,
 * which handles token exchange + Supabase persistence.
 * We forward the code to /api/integrations/{provider}/callback so the
 * existing server-side logic (exchangeCode, encrypt, supabase.upsert) runs.
 */
async function forwardCodeToApp(provider, code, userId) {
  return new Promise((resolve, reject) => {
    const cbPath =
      provider === "google"
        ? `/api/integrations/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(userId)}`
        : `/api/integrations/meta/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(userId)}`;

    const reqOptions = {
      hostname: "127.0.0.1",
      port: activePort,
      path: cbPath,
      method: "GET",
    };

    const req = http.request(reqOptions, (res) => {
      // Redirect means success — Next.js callback redirects to /dashboard/integrations?connected=...
      if (res.statusCode === 302 || res.statusCode === 301 || res.statusCode === 200) {
        const location = res.headers.location || "";
        if (location.includes("error=")) {
          reject(new Error("Server rejected OAuth code"));
        } else {
          resolve(true);
        }
      } else {
        reject(new Error(`Unexpected status ${res.statusCode} from callback`));
      }
      // Drain
      res.resume();
    });
    req.on("error", reject);
    req.end();
  });
}

/**
 * Start an OAuth flow for the given provider.
 * Returns { success: boolean, error?: string }
 */
function startOAuthFlow(provider) {
  return new Promise((resolve) => {
    // state = random nonce; in a real flow you'd also use this to tie to a Clerk session.
    // For first-run setup we use a simple placeholder since the user isn't signed in yet.
    const state = crypto.randomBytes(16).toString("hex");
    let redirectServer = null;
    let settled = false;

    function finish(result) {
      if (settled) return;
      settled = true;
      try { redirectServer && redirectServer.close(); } catch {}
      resolve(result);
    }

    // Build the provider auth URL
    const authUrl =
      provider === "google"
        ? buildGoogleAuthUrl(state)
        : buildMetaAuthUrl(state);

    // Open system browser
    shell.openExternal(authUrl).catch((err) => {
      finish({ success: false, error: "Could not open browser: " + err.message });
      return;
    });

    // Spin up temporary redirect-catcher
    redirectServer = http.createServer(async (req, res) => {
      const parsed = new url.URL(req.url, `http://localhost:${OAUTH_REDIRECT_PORT}`);

      if (parsed.pathname !== "/callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const code = parsed.searchParams.get("code");
      const returnedState = parsed.searchParams.get("state");
      const error = parsed.searchParams.get("error");

      if (error) {
        // Send a friendly close page
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(closePage("Connection cancelled", `The ${provider} connection was cancelled. You can close this tab.`, false));
        finish({ success: false, error: `Provider returned: ${error}` });
        return;
      }

      if (!code) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(closePage("Missing code", "OAuth response was missing the authorization code.", false));
        finish({ success: false, error: "No authorization code in redirect" });
        return;
      }

      // For setup wizard we don't have a Clerk userId yet — store the raw tokens
      // directly via the Next.js API, or save them to disk config for post-setup sync.
      // We pass a placeholder userId; the Next.js callback will look up the real user
      // once the user signs in, or you can pass the Clerk userId via state in production.
      const userId = "setup_pending";

      try {
        await forwardCodeToApp(provider, code, userId);
        // Save a flag so we know this provider was connected during setup
        writeConfig({ [`${provider}_connected`]: true });
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(closePage(
          `${provider === "google" ? "Google" : "Meta"} Connected!`,
          "You can close this tab and return to Pulse Setup.",
          true
        ));
        finish({ success: true });
      } catch (err) {
        console.error(`[OAuth] Forward error (${provider}):`, err.message);
        // Even if the Next.js forward fails (e.g. user not in DB yet), save the code
        // to disk config so it can be re-exchanged after sign-in.
        writeConfig({ [`${provider}_pending_code`]: code, [`${provider}_connected`]: false });
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(closePage(
          `${provider === "google" ? "Google" : "Meta"} Connected!`,
          "Your credentials have been saved. You can close this tab and return to Pulse Setup.",
          true
        ));
        // We still resolve as success from the UI perspective — code is stored
        finish({ success: true });
      }
    });

    redirectServer.listen(OAUTH_REDIRECT_PORT, "127.0.0.1", () => {
      console.log(`[OAuth] Redirect server listening on port ${OAUTH_REDIRECT_PORT}`);
    });

    redirectServer.on("error", (err) => {
      console.error("[OAuth] Redirect server error:", err.message);
      finish({ success: false, error: "Could not start local redirect server: " + err.message });
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      finish({ success: false, error: "OAuth timed out — please try again." });
    }, 5 * 60 * 1000);
  });
}

/** Returns a minimal HTML page shown in the browser after OAuth redirect */
function closePage(title, message, success) {
  const color = success ? "#00e5cc" : "#f87171";
  const icon = success ? "✓" : "✗";
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#0a0f1e;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
         display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px}
    .icon{width:64px;height:64px;border-radius:50%;background:${color}20;border:2px solid ${color};
          display:flex;align-items:center;justify-content:center;font-size:28px;color:${color}}
    h1{font-size:22px;font-weight:700}
    p{font-size:14px;color:#64748b;text-align:center;max-width:360px;line-height:1.6}
  </style>
</head>
<body>
  <div class="icon">${icon}</div>
  <h1>${title}</h1>
  <p>${message}</p>
  <script>setTimeout(()=>window.close(),3000)</script>
</body>
</html>`;
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────

// OAuth start (invoked by setup.html)
ipcMain.handle("oauth:start", async (_event, provider) => {
  console.log(`[IPC] oauth:start → ${provider}`);
  try {
    const result = await startOAuthFlow(provider);
    // Also push result as an event so listeners (onOAuthResult) receive it
    const win = setupWindow || mainWindow;
    if (win && !win.isDestroyed()) {
      win.webContents.send("oauth:result", { provider, ...result });
    }
    return result;
  } catch (err) {
    return { success: false, error: String(err.message || err) };
  }
});

// Config save (used by Shopify step)
ipcMain.handle("config:save", async (_event, values) => {
  try {
    const merged = writeConfig(values);
    return { success: true, config: merged };
  } catch (err) {
    return { success: false, error: String(err.message || err) };
  }
});

// Config get
ipcMain.handle("config:get", async (_event, key) => {
  const cfg = readConfig();
  if (!key) return cfg;
  // Support dotted keys e.g. "shopify.store"
  return key.split(".").reduce((obj, k) => (obj && obj[k] !== undefined ? obj[k] : null), cfg);
});

// Setup complete — mark done, open main window
ipcMain.handle("setup:complete", async () => {
  try {
    writeConfig({ setupComplete: true });
    console.log("[Pulse] Setup complete. Opening main window.");
    createMainWindow(activePort);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err.message || err) };
  }
});

// Redeem a pending OAuth code that was captured during first-run setup
// (before the user was signed into Clerk). Called from the desktop dashboard
// after sign-in, once we know the real Clerk userId.
ipcMain.handle("oauth:redeem", async (_event, provider, userId) => {
  console.log(`[IPC] oauth:redeem → ${provider} for user ${userId}`);
  try {
    const cfg = readConfig();
    const pendingCode = cfg[`${provider}_pending_code`];
    if (!pendingCode) {
      // Nothing to redeem — integration either already synced or never started
      return { success: true, skipped: true };
    }

    await forwardCodeToApp(provider, pendingCode, userId);

    // Clear the pending code and mark connected
    const update = {};
    update[`${provider}_pending_code`] = null;
    update[`${provider}_connected`] = true;
    writeConfig(update);

    console.log(`[OAuth] Redeemed pending ${provider} code for user ${userId}`);
    return { success: true, skipped: false };
  } catch (err) {
    console.error(`[OAuth] Redeem error (${provider}):`, err.message);
    return { success: false, error: String(err.message || err) };
  }
});

// Shell open external
ipcMain.handle("shell:openExternal", async (_event, targetUrl) => {
  try {
    await shell.openExternal(targetUrl);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err.message || err) };
  }
});

// ─── Cleanup ──────────────────────────────────────────────────────────────────
function cleanup() {
  appQuitting = true;
  if (nextProcess) {
    try { nextProcess.kill(); } catch {}
  }
  if (ollamaProcess && !ollamaProcess.killed) {
    try { ollamaProcess.kill(); } catch {}
  }
}

// ─── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  createLoadingWindow();

  try {
    if (DEV) {
      console.log(`[Pulse] DEV mode — port ${DEV_PORT}`);
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

    createTray();

    // ── First-run check ──────────────────────────────────────────────────────
    if (isSetupComplete()) {
      console.log("[Pulse] Setup already complete — opening main window.");
      createMainWindow(activePort);
    } else {
      console.log("[Pulse] First run detected — opening setup wizard.");
      createSetupWindow();
    }

  } catch (err) {
    console.error("[Pulse] Startup error:", err);
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      loadingWindow.webContents
        .executeJavaScript(
          `document.getElementById('status').textContent = 'Startup failed: ${String(err.message).replace(/['"\\]/g, "")}'`
        )
        .catch(() => {});
    }
  }
});

app.on("before-quit", cleanup);
app.on("will-quit", cleanup);

app.on("window-all-closed", () => {
  // Keep alive via tray on all platforms
});

app.on("activate", () => {
  const win = mainWindow || setupWindow;
  if (win) { win.show(); win.focus(); }
});
