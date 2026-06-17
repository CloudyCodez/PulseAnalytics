const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  shell,
  utilityProcess,
  ipcMain,
  session,
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

// ─── This header is how the middleware knows a request comes from the Electron
//     app. It is injected at the session level so every single request the app
//     makes — including page navigations, API calls, and asset fetches — carries
//     it automatically. The middleware blocks any app-only route that arrives
//     without this header, so typing the URL into a browser does nothing.
const ELECTRON_HEADER_NAME  = "x-pulse-client";
const ELECTRON_HEADER_VALUE = "electron";

// ─── Process handles ─────────────────────────────────────────────────────────
let nextProcess   = null;
let ollamaProcess = null;

// ─── Windows ──────────────────────────────────────────────────────────────────
let mainWindow   = null;
let loadingWindow = null;
let setupWindow  = null;
let tray         = null;
let appQuitting  = false;

// ─── On-disk config store ─────────────────────────────────────────────────────
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
    const merged   = deepMerge(existing, data);
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
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      out[key] = deepMerge(out[key] || {}, source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

function isSetupComplete() {
  return readConfig().setupComplete === true;
}

// ─── Inject x-pulse-client header on every outgoing request ───────────────────
// This runs once after app is ready, before any window opens. It intercepts
// every HTTP request made by any BrowserWindow and appends the header.
// The Next.js middleware checks for this header to allow access to app-only routes.
function installElectronHeader() {
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders[ELECTRON_HEADER_NAME] = ELECTRON_HEADER_VALUE;
    callback({ requestHeaders: details.requestHeaders });
  });
}

// ─── Single-instance lock ─────────────────────────────────────────────────────
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

// ─── Ollama (internal — never exposed to user) ────────────────────────────────
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
    try { if (fs.existsSync(c)) return c; } catch {}
  }
  return process.platform === "win32" ? "ollama.exe" : "ollama";
}

function startOllama() {
  return new Promise((resolve) => {
    const req = http.get("http://localhost:11434", () => {
      console.log("[Pulse] AI engine already running.");
      resolve();
    });
    req.on("error", () => {
      const binary = findOllamaBinary();
      console.log("[Pulse] Starting AI engine…");
      ollamaProcess = spawn(binary, ["serve"], {
        detached: false,
        stdio:    "ignore",
        shell:    false,
        env:      { ...process.env },
      });
      ollamaProcess.on("error", (err) => {
        console.warn("[Pulse] AI engine failed to start:", err.message);
        resolve();
      });
      setTimeout(resolve, 4000);
    });
    req.end();
  });
}

/**
 * Install Ollama silently and pull the model.
 * Reports progress back via progressCb({ pct, label }) — labels are
 * Pulse-branded, never mentioning Ollama or llama3.1 to the user.
 */
function installAndPullOllama(progressCb) {
  return new Promise(async (resolve) => {
    const sendProgress = (pct, label) => {
      try { progressCb && progressCb({ pct, label }); } catch {}
    };

    // ── Check if already installed ──────────────────────────────────────────
    sendProgress(5, "Checking Pulse AI…");
    const binary = findOllamaBinary();
    const alreadyInstalled = fs.existsSync(binary) || await checkOllamaRunning();

    if (!alreadyInstalled) {
      // ── Download and silent-install Ollama ────────────────────────────────
      sendProgress(10, "Downloading Pulse AI…");
      const installerPath = path.join(os.tmpdir(), "pulse-ai-setup.exe");

      try {
        await downloadFile(
          "https://ollama.com/download/OllamaSetup.exe",
          installerPath,
          (pct) => sendProgress(10 + Math.round(pct * 0.3), "Downloading Pulse AI…")
        );
        sendProgress(40, "Installing Pulse AI…");
        await runSilentInstaller(installerPath);
        sendProgress(50, "Finalising installation…");
        await new Promise(r => setTimeout(r, 4000)); // let installer finish
      } catch (err) {
        console.error("[Pulse AI] Install failed:", err.message);
        return resolve({ success: false, error: "Installation failed. Please try again." });
      }
    } else {
      sendProgress(50, "Pulse AI found — loading model…");
    }

    // ── Start the Ollama server ────────────────────────────────────────────
    await startOllama();
    sendProgress(55, "Starting Pulse AI engine…");
    await new Promise(r => setTimeout(r, 2000));

    // ── Pull llama3.1 model ───────────────────────────────────────────────
    // Check if model already downloaded
    const modelExists = await checkModelExists("llama3.1");
    if (modelExists) {
      sendProgress(100, "Pulse AI is ready");
      return resolve({ success: true });
    }

    sendProgress(58, "Preparing AI model (this is a one-time download)…");

    try {
      await pullModel("llama3.1", (pct, detail) => {
        // Map 0–100 of pull to 58–98 of overall progress
        const overall = 58 + Math.round(pct * 0.4);
        sendProgress(overall, detail || "Downloading AI model…");
      });
      sendProgress(100, "Pulse AI is ready");
      resolve({ success: true });
    } catch (err) {
      console.error("[Pulse AI] Model pull failed:", err.message);
      resolve({ success: false, error: "Could not load AI model. Check your connection and try again." });
    }
  });
}

function checkOllamaRunning() {
  return new Promise((resolve) => {
    const req = http.get("http://localhost:11434", () => resolve(true));
    req.on("error", () => resolve(false));
    req.end();
  });
}

function checkModelExists(modelName) {
  return new Promise((resolve) => {
    const req = http.get("http://localhost:11434/api/tags", (res) => {
      let body = "";
      res.on("data", d => body += d);
      res.on("end", () => {
        try {
          const data = JSON.parse(body);
          const models = (data.models || []).map(m => m.name);
          resolve(models.some(m => m.includes(modelName)));
        } catch {
          resolve(false);
        }
      });
    });
    req.on("error", () => resolve(false));
    req.end();
  });
}

function downloadFile(fileUrl, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(fileUrl, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return downloadFile(res.headers.location, destPath, onProgress).then(resolve).catch(reject);
      }
      const total = parseInt(res.headers["content-length"] || "0", 10);
      let downloaded = 0;
      res.on("data", chunk => {
        downloaded += chunk.length;
        if (total > 0 && onProgress) onProgress(downloaded / total);
      });
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

function runSilentInstaller(installerPath) {
  return new Promise((resolve, reject) => {
    // /S = silent install for NSIS-based Ollama installer
    const proc = spawn(installerPath, ["/S"], { detached: false, stdio: "ignore", shell: false });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Installer exited with code ${code}`));
    });
    proc.on("error", reject);
  });
}

function pullModel(modelName, onProgress) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ name: modelName, stream: true });
    const options = {
      hostname: "127.0.0.1",
      port: 11434,
      path: "/api/pull",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let buffer = "";
      res.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            if (obj.total && obj.completed) {
              const pct = Math.round((obj.completed / obj.total) * 100);
              onProgress && onProgress(pct, null);
            }
            if (obj.status === "success") {
              resolve();
            }
          } catch {}
        }
      });
      res.on("end", () => resolve());
    });

    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

// ─── Next.js via utilityProcess ───────────────────────────────────────────────
function startNextJS(port) {
  return new Promise((resolve, reject) => {
    const standalonePath = path.join(process.resourcesPath, "standalone");
    const serverScript   = path.join(standalonePath, "server.js");

    if (!fs.existsSync(serverScript)) {
      return reject(new Error(`server.js not found at: ${serverScript}`));
    }

    console.log(`[Pulse] Starting Next.js on port ${port}`);

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
      if (!resolved) reject(new Error(`Next.js exited with code ${code}`));
    });
    setTimeout(() => { if (!resolved) { resolved = true; resolve(); } }, 25000);
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
    width: 420, height: 280,
    frame: false, transparent: true, resizable: false,
    center: true, alwaysOnTop: true,
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
    width: 860, height: 580,
    minWidth: 720, minHeight: 480,
    resizable: true, center: true,
    show: false, title: "Pulse Setup",
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

  setupWindow.on("close", (e) => {
    if (!appQuitting && (!mainWindow || mainWindow.isDestroyed())) {
      e.preventDefault();
    }
  });
}

// ─── Main app window ──────────────────────────────────────────────────────────
// Loads /app — the Electron-only analytics dashboard.
// The middleware blocks /app from any browser request that lacks the
// x-pulse-client header, so this URL is unreachable outside the EXE.
function createMainWindow(port) {
  const icon = loadIcon();
  mainWindow = new BrowserWindow({
    width: 1280, height: 820,
    minWidth: 960, minHeight: 620,
    show: false, title: "Pulse",
    backgroundColor: "#0a0f1e",
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://localhost:${port}/app`);

  mainWindow.once("ready-to-show", () => {
    closeLoading();
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

  // External links open in system browser, never inside the app
  mainWindow.webContents.setWindowOpenHandler(({ url: openUrl }) => {
    shell.openExternal(openUrl);
    return { action: "deny" };
  });
}

// ─── System tray ──────────────────────────────────────────────────────────────
function createTray() {
  const icon = loadIcon();
  const trayIcon = icon ? icon.resize({ width: 16, height: 16 }) : nativeImage.createEmpty();

  tray = new Tray(trayIcon);
  tray.setToolTip("Pulse");

  const menu = Menu.buildFromTemplate([
    {
      label: "Open Pulse",
      click: () => {
        const win = mainWindow || setupWindow;
        if (win) { win.show(); win.focus(); }
      },
    },
    { type: "separator" },
    { label: "Quit Pulse", click: () => { appQuitting = true; app.quit(); } },
  ]);

  tray.setContextMenu(menu);
  tray.on("double-click", () => {
    const win = mainWindow || setupWindow;
    if (win) { win.show(); win.focus(); }
  });
}

// ─── OAuth redirect-catcher ───────────────────────────────────────────────────
const OAUTH_REDIRECT_PORT = 9988;
const OAUTH_REDIRECT_URI  = `http://localhost:${OAUTH_REDIRECT_PORT}/callback`;

// ─── OAuth credentials ────────────────────────────────────────────────────────
// These are the Pulse platform OAuth app credentials — public values that
// identify YOUR Google Cloud / Meta app to their OAuth servers.
// They are the same for every client install. Each client's tokens are what
// vary and get stored locally after their individual OAuth flow completes.
const GOOGLE_CLIENT_ID = "392683699806-sojhci4aojm3qnjovcom4d5rb9p8fpio.apps.googleusercontent.com";
const META_APP_ID      = ""; // fill in once Meta app is set up

function buildGoogleAuthUrl(state) {
  const scopes = [
    "https://www.googleapis.com/auth/adwords",
    "https://www.googleapis.com/auth/analytics.readonly",
    "openid", "email",
  ].join(" ");
  const params = new url.URLSearchParams({
    client_id: GOOGLE_CLIENT_ID, redirect_uri: OAUTH_REDIRECT_URI,
    response_type: "code", scope: scopes,
    access_type: "offline", prompt: "consent", state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

function buildMetaAuthUrl(state) {
  const scopes = "ads_read,ads_management,read_insights,email";
  const params = new url.URLSearchParams({
    client_id: META_APP_ID, redirect_uri: OAUTH_REDIRECT_URI,
    response_type: "code", scope: scopes, state,
  });
  return `https://www.facebook.com/v20.0/dialog/oauth?${params}`;
}

async function forwardCodeToApp(provider, code, userId) {
  return new Promise((resolve, reject) => {
    const cbPath = provider === "google"
      ? `/api/integrations/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(userId)}`
      : `/api/integrations/meta/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(userId)}`;

    const req = http.request(
      { hostname: "127.0.0.1", port: activePort, path: cbPath, method: "GET" },
      (res) => {
        const location = res.headers.location || "";
        if ((res.statusCode >= 200 && res.statusCode < 400) && !location.includes("error=")) {
          resolve(true);
        } else {
          reject(new Error("Server rejected OAuth code"));
        }
        res.resume();
      }
    );
    req.on("error", reject);
    req.end();
  });
}

function startOAuthFlow(provider) {
  return new Promise((resolve) => {
    const state = crypto.randomBytes(16).toString("hex");
    let redirectServer = null;
    let settled = false;

    function finish(result) {
      if (settled) return;
      settled = true;
      try { redirectServer && redirectServer.close(); } catch {}
      resolve(result);
    }

    const authUrl = provider === "google" ? buildGoogleAuthUrl(state) : buildMetaAuthUrl(state);
    shell.openExternal(authUrl).catch((err) => finish({ success: false, error: "Could not open browser: " + err.message }));

    redirectServer = http.createServer(async (req, res) => {
      const parsed = new url.URL(req.url, `http://localhost:${OAUTH_REDIRECT_PORT}`);
      if (parsed.pathname !== "/callback") { res.writeHead(404); res.end(); return; }

      const code  = parsed.searchParams.get("code");
      const error = parsed.searchParams.get("error");

      if (error || !code) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(oauthClosePage(false, provider));
        finish({ success: false, error: error || "No authorization code" });
        return;
      }

      try {
        await forwardCodeToApp(provider, code, "setup_pending");
        writeConfig({ [`${provider}_connected`]: true });
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(oauthClosePage(true, provider));
        finish({ success: true });
      } catch (err) {
        // Store code for post-sign-in redemption
        writeConfig({ [`${provider}_pending_code`]: code, [`${provider}_connected`]: false });
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(oauthClosePage(true, provider));
        finish({ success: true });
      }
    });

    redirectServer.listen(OAUTH_REDIRECT_PORT, "127.0.0.1");
    redirectServer.on("error", (err) => finish({ success: false, error: "Could not start redirect listener: " + err.message }));
    setTimeout(() => finish({ success: false, error: "Connection timed out — please try again." }), 5 * 60 * 1000);
  });
}

function oauthClosePage(success, provider) {
  const c    = success ? "#00e5cc" : "#f87171";
  const icon = success ? "✓" : "✗";
  const msg  = success
    ? `${provider === "google" ? "Google" : "Meta"} connected. You can close this tab.`
    : "Connection was cancelled. You can close this tab.";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#0a0f1e;color:#fff;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:14px}
    .i{width:56px;height:56px;border-radius:50%;background:${c}20;border:2px solid ${c};display:flex;align-items:center;justify-content:center;font-size:24px;color:${c}}
    h1{font-size:18px;font-weight:700}p{font-size:13px;color:#64748b;text-align:center;max-width:320px}
  </style></head><body>
    <div class="i">${icon}</div><h1>Pulse</h1><p>${msg}</p>
    <script>setTimeout(()=>window.close(),2500)</script>
  </body></html>`;
}

// ─── Shopify verification ─────────────────────────────────────────────────────
async function verifyShopifyToken(store, token) {
  return new Promise((resolve) => {
    const hostname = store.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const options = {
      hostname,
      path: "/admin/api/2024-01/shop.json",
      method: "GET",
      headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
    };
    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", d => body += d);
      res.on("end", () => {
        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(body);
            resolve({ success: true, shopName: data.shop?.name || hostname });
          } catch {
            resolve({ success: true, shopName: hostname });
          }
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          resolve({ success: false, error: "Invalid access token — check it was copied correctly." });
        } else {
          resolve({ success: false, error: `Shopify returned status ${res.statusCode}. Check your store URL.` });
        }
      });
    });
    req.on("error", (err) => resolve({ success: false, error: "Could not reach Shopify: " + err.message }));
    req.end();
  });
}

// ─── Klaviyo verification ─────────────────────────────────────────────────────
async function verifyKlaviyoKey(apiKey) {
  return new Promise((resolve) => {
    const options = {
      hostname: "a.klaviyo.com",
      path: "/api/accounts/",
      method: "GET",
      headers: {
        "Authorization": `Klaviyo-API-Key ${apiKey}`,
        "revision": "2024-02-15",
        "Accept": "application/json",
      },
    };
    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", d => body += d);
      res.on("end", () => {
        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(body);
            const orgName = data.data?.[0]?.attributes?.contact_information?.organization_name || "";
            resolve({ success: true, orgName });
          } catch {
            resolve({ success: true, orgName: "" });
          }
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          resolve({ success: false, error: "Invalid API key — make sure it has read access." });
        } else {
          resolve({ success: false, error: `Klaviyo returned status ${res.statusCode}.` });
        }
      });
    });
    req.on("error", (err) => resolve({ success: false, error: "Could not reach Klaviyo: " + err.message }));
    req.end();
  });
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────

ipcMain.handle("oauth:start", async (_e, provider) => {
  try {
    const result = await startOAuthFlow(provider);
    const win = setupWindow || mainWindow;
    if (win && !win.isDestroyed()) win.webContents.send("oauth:result", { provider, ...result });
    return result;
  } catch (err) {
    return { success: false, error: String(err.message || err) };
  }
});

ipcMain.handle("oauth:redeem", async (_e, provider, userId) => {
  try {
    const cfg = readConfig();
    const pendingCode = cfg[`${provider}_pending_code`];
    if (!pendingCode) return { success: true, skipped: true };
    await forwardCodeToApp(provider, pendingCode, userId);
    writeConfig({ [`${provider}_pending_code`]: null, [`${provider}_connected`]: true });
    return { success: true, skipped: false };
  } catch (err) {
    return { success: false, error: String(err.message || err) };
  }
});

ipcMain.handle("config:save", async (_e, values) => {
  try   { return { success: true, config: writeConfig(values) }; }
  catch (err) { return { success: false, error: String(err.message || err) }; }
});

ipcMain.handle("config:get", async (_e, key) => {
  const cfg = readConfig();
  if (!key) return cfg;
  return key.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), cfg);
});

// Pulse AI install — completely silent, progress labels are Pulse-branded
ipcMain.handle("ollama:install", async (_e) => {
  const win = setupWindow || mainWindow;
  const sendProgress = (pct, label) => {
    if (win && !win.isDestroyed()) win.webContents.send("ollama:progress", { pct, label });
  };
  return installAndPullOllama(sendProgress);
});

ipcMain.handle("verify:shopify", async (_e, store, token) => verifyShopifyToken(store, token));
ipcMain.handle("verify:klaviyo", async (_e, apiKey) => verifyKlaviyoKey(apiKey));

ipcMain.handle("setup:complete", async () => {
  try {
    writeConfig({ setupComplete: true });
    createMainWindow(activePort);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err.message || err) };
  }
});

ipcMain.handle("shell:openExternal", async (_e, targetUrl) => {
  try   { await shell.openExternal(targetUrl); return { success: true }; }
  catch (err) { return { success: false, error: String(err.message || err) }; }
});

// ─── Cleanup ──────────────────────────────────────────────────────────────────
function cleanup() {
  appQuitting = true;
  try { nextProcess && nextProcess.kill(); } catch {}
  try { ollamaProcess && !ollamaProcess.killed && ollamaProcess.kill(); } catch {}
}

// ─── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Install the Electron identity header before any window opens
  installElectronHeader();
  createLoadingWindow();

  try {
    if (DEV) {
      console.log(`[Pulse] DEV mode — port ${DEV_PORT}`);
      activePort = DEV_PORT;
      await startOllama();
      await waitForNextJS(activePort);
    } else {
      activePort = await findAvailablePort(PREFERRED_PORT);
      await startOllama();
      await startNextJS(activePort);
      await waitForNextJS(activePort);
    }

    createTray();

    if (isSetupComplete()) {
      createMainWindow(activePort);
    } else {
      createSetupWindow();
    }

  } catch (err) {
    console.error("[Pulse] Startup error:", err);
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      loadingWindow.webContents.executeJavaScript(
        `document.getElementById('status').textContent = 'Startup failed: ${String(err.message).replace(/['"\\]/g, "")}'`
      ).catch(() => {});
    }
  }
});

app.on("before-quit", cleanup);
app.on("will-quit", cleanup);
app.on("window-all-closed", () => { /* stay alive in tray */ });
app.on("activate", () => {
  const win = mainWindow || setupWindow;
  if (win) { win.show(); win.focus(); }
});
