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
const dns = require("dns");

// ─── Force "localhost" to resolve to IPv4 first ────────────────────────────────
// Node 17+ defaults to verbatim DNS ordering, which on many Windows machines
// means "localhost" resolves to ::1 (IPv6) before 127.0.0.1. Next.js standalone
// internally reconstructs request URLs as "http://localhost:<port>/..." rather
// than echoing the real Host header, so if anything (Electron's BrowserWindow,
// a redirect, a fetch from inside the app) ever uses that reconstructed
// "localhost" URL, it can land on a totally different listener over IPv6 than
// the real Next.js server bound on 127.0.0.1 — producing a 404 from whatever
// (if anything) is listening on the IPv6 loopback, even though the IPv4
// server is healthy. Forcing ipv4first here makes "localhost" deterministically
// mean 127.0.0.1 everywhere in this process and in the Next.js child process
// that inherits this env, closing the gap for good instead of chasing every
// individual "localhost" string in the codebase.
try { dns.setDefaultResultOrder("ipv4first"); } catch (e) { /* older Node, ignore */ }

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
let licenseWindow = null;
let tray         = null;
let appQuitting  = false;

// ─── File logging (packaged GUI apps have no visible console) ────────────────
const LOG_PATH = path.join(app.getPath("userData"), "pulse.log");
function logToFile(...args) {
  const line = `[${new Date().toISOString()}] ${args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ")}\n`;
  try { fs.appendFileSync(LOG_PATH, line); } catch {}
}
const _origLog = console.log;
const _origErr = console.error;
console.log = (...args) => { _origLog(...args); logToFile("[log]", ...args); };
console.error = (...args) => { _origErr(...args); logToFile("[error]", ...args); };
process.on("uncaughtException", (err) => logToFile("[uncaughtException]", err.stack || err.message));
process.on("unhandledRejection", (err) => logToFile("[unhandledRejection]", (err && err.stack) || err));

// ─── Load .env.local into THIS process (Electron main) ───────────────────────
// .env.local is a Next.js convention — Next.js inlines NEXT_PUBLIC_* vars into
// the client bundle at build time, but plain server vars (CLERK_SECRET_KEY,
// STRIPE_SECRET_KEY, etc.) are only read from process.env at runtime by the
// Next.js standalone server. Electron's main process never loads .env.local on
// its own, so without this, none of those secrets reach the spawned Next.js
// child process — which is why Clerk/Stripe/etc. crash with "missing key"
// errors in the packaged app even though .env.local has the real values.
function loadDotEnvLocal() {
  // electron-builder copies the repo root's package.json next to electron/,
  // but .env.local is intentionally never bundled (it's gitignored / secret).
  // In dev, __dirname is <repo>/electron, so .env.local is one level up.
  // In a packaged build there is no .env.local on disk at all unless we put
  // one there — see build-pulse.bat, which copies .env.local into resources/
  // before packaging specifically so this function can find it.
  const candidates = [
    path.join(__dirname, "..", ".env.local"),                 // dev / unpackaged
    path.join(process.resourcesPath || "", ".env.local"),     // packaged build
  ];
  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const raw = fs.readFileSync(candidate, "utf8");
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        // strip matching surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (key && process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
      return candidate;
    } catch (e) {
      // try next candidate
    }
  }
  return null;
}
const loadedEnvFrom = loadDotEnvLocal();
console.log(loadedEnvFrom ? `[Pulse] Loaded env from ${loadedEnvFrom}` : "[Pulse] WARNING: no .env.local found — server-side secrets (Clerk, Stripe, etc.) will be missing");

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

function getStoredLicenseEmail() {
  const cfg = readConfig();
  return cfg.license && cfg.license.verified === true ? cfg.license.email : null;
}

// ─── License verification ──────────────────────────────────────────────────
// Calls the Pulse web app's public /api/desktop/verify endpoint. This is a
// plain HTTPS call to the deployed Vercel app (NOT the local Next.js child
// process), since license state lives in production Supabase regardless of
// which port the local standalone server happens to be bound to.
const LICENSE_API_URL = "https://pulseanalytics.space/api/desktop/verify";

function verifyLicenseEmail(email, targetUrl = LICENSE_API_URL, redirectsLeft = 3) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ email });
    const req = https.request(
      targetUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      },
      (res) => {
        // Follow redirects (e.g. apex domain -> www) instead of trying to
        // JSON.parse an HTML redirect body, which silently looked like a
        // "server_error" with no logged cause.
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && redirectsLeft > 0) {
          res.resume();
          const nextUrl = new url.URL(res.headers.location, targetUrl).toString();
          resolve(verifyLicenseEmail(email, nextUrl, redirectsLeft - 1));
          return;
        }
        let body = "";
        res.on("data", (d) => (body += d));
        res.on("end", () => {
          try {
            const data = JSON.parse(body);
            resolve(data);
          } catch (e) {
            console.error("[Pulse] License verify non-JSON response:", res.statusCode, body.slice(0, 200));
            resolve({ valid: false, reason: "server_error" });
          }
        });
      }
    );
    req.on("error", (err) => {
      console.error("[Pulse] License verify request failed:", err.message);
      resolve({ valid: false, reason: "server_error" });
    });
    req.write(postData);
    req.end();
  });
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
  // TEMP DIAGNOSTIC: log every single request this session makes and its
  // final status, so we can see exactly what the window requests when it
  // loads /app and whether some other sub-request (favicon, RSC fetch,
  // prefetch, etc.) is the one actually 404ing rather than the navigation
  // we're manually curling.
  session.defaultSession.webRequest.onCompleted((details) => {
    console.log(
      "[Pulse][netlog]",
      details.method,
      details.url,
      "status=" + details.statusCode,
      "fromCache=" + details.fromCache
    );
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
      const req = http.get(`http://127.0.0.1:${port}`, () => resolve());
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

// ─── Voice input (whisper.cpp — internal — never exposed to user) ────────────
// The Web Speech API's SpeechRecognition (webkitSpeechRecognition) is a
// non-starter inside Electron: it's not actually local speech-to-text, it's
// a thin client that streams mic audio to Google's speech servers and waits
// for a transcript, authenticated with an API key that only ships in
// official Google Chrome builds. Electron's bundled Chromium doesn't have
// that key, so the request to Google never resolves — recognition.onstart
// fires (mic opens fine, UI correctly shows "listening"), but no transcript
// (interim or final) ever comes back, and depending on the Chromium build it
// may not even surface as a proper onerror. That's the exact "stuck on
// Listening, never picks anything up" symptom.
//
// The fix: do speech-to-text fully locally with whisper.cpp, the same way
// Pulse AI's chat already runs fully locally via Ollama. We download a
// prebuilt CPU-only Windows binary + a small English model once (mirroring
// installAndPullOllama's pattern below), then for each utterance: capture
// raw mic audio in the renderer, encode it to a 16kHz mono WAV, hand the
// bytes to this process over IPC, run whisper-cli.exe against a temp WAV
// file, and read back the plain-text transcript it writes to disk.
const WHISPER_DIR        = path.join(app.getPath("userData"), "whisper");
const WHISPER_BIN_DIR    = path.join(WHISPER_DIR, "bin");
const WHISPER_MODEL_DIR  = path.join(WHISPER_DIR, "models");
const WHISPER_MODEL_PATH = path.join(WHISPER_MODEL_DIR, "ggml-base.en.bin");
// GitHub's "latest" release alias always resolves to whatever the current
// release's asset with this exact filename is — same reasoning as the
// versionless Ollama download URL above, so this doesn't go stale.
const WHISPER_ZIP_URL    = "https://github.com/ggml-org/whisper.cpp/releases/latest/download/whisper-bin-x64.zip";
// base.en (~148MB) — noticeably more accurate than tiny.en (~75MB) for a
// modest size difference, and English-only (.en models) is meaningfully
// better than the multilingual variant at the same size since Pulse AI's
// chat is English-only anyway.
const WHISPER_MODEL_URL  = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin";

function findWhisperBinary() {
  const candidates = [
    path.join(WHISPER_BIN_DIR, "whisper-cli.exe"), // current whisper.cpp releases
    path.join(WHISPER_BIN_DIR, "main.exe"),         // older releases named it this
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch {}
  }
  return null;
}

function isWhisperReady() {
  return !!findWhisperBinary() && fs.existsSync(WHISPER_MODEL_PATH);
}

function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    try { fs.mkdirSync(destDir, { recursive: true }); } catch (e) { return reject(e); }
    // Windows ships PowerShell's Expand-Archive by default on every 10/11
    // install (PS 5.1+) — avoids pulling in a node zip dependency just to
    // unpack a ~4MB archive.
    const escZip  = zipPath.replace(/'/g, "''");
    const escDest = destDir.replace(/'/g, "''");
    const psCmd = `Expand-Archive -LiteralPath '${escZip}' -DestinationPath '${escDest}' -Force`;
    const proc = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", psCmd], {
      stdio: "ignore",
      shell: false,
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Expand-Archive exited with code ${code}`));
    });
    proc.on("error", reject);
  });
}

/**
 * Download + install whisper.cpp's binary and model if not already present.
 * Reports progress via progressCb({ pct, label }), Pulse-branded labels only
 * — same convention as installAndPullOllama above.
 */
function installWhisper(progressCb) {
  return new Promise(async (resolve) => {
    const sendProgress = (pct, label) => { try { progressCb && progressCb({ pct, label }); } catch {} };

    if (isWhisperReady()) {
      sendProgress(100, "Voice input is ready");
      return resolve({ success: true });
    }

    try {
      fs.mkdirSync(WHISPER_DIR, { recursive: true });

      if (!findWhisperBinary()) {
        sendProgress(5, "Downloading voice input engine…");
        const zipPath = path.join(os.tmpdir(), "pulse-whisper-bin.zip");
        await downloadFile(WHISPER_ZIP_URL, zipPath, (pct) =>
          sendProgress(5 + Math.round(pct * 20), "Downloading voice input engine…")
        );
        sendProgress(28, "Installing voice input engine…");
        await extractZip(zipPath, WHISPER_BIN_DIR);
        try { fs.unlinkSync(zipPath); } catch {}
      }

      if (!fs.existsSync(WHISPER_MODEL_PATH)) {
        fs.mkdirSync(WHISPER_MODEL_DIR, { recursive: true });
        sendProgress(35, "Downloading voice model (one-time, ~150MB)…");
        await downloadFile(WHISPER_MODEL_URL, WHISPER_MODEL_PATH, (pct) =>
          sendProgress(35 + Math.round(pct * 60), "Downloading voice model (one-time, ~150MB)…")
        );
      }

      if (!isWhisperReady()) {
        return resolve({ success: false, error: "Voice input setup completed but files are missing — try again." });
      }

      sendProgress(100, "Voice input is ready");
      resolve({ success: true });
    } catch (err) {
      console.error("[Pulse] Voice input setup failed:", err.message);
      resolve({ success: false, error: "Could not set up voice input: " + err.message });
    }
  });
}

/**
 * Run whisper-cli.exe against raw WAV bytes (16kHz mono PCM, built by the
 * renderer) and return the plain-text transcript.
 */
function transcribeAudio(wavBytes) {
  return new Promise((resolve) => {
    const binary = findWhisperBinary();
    if (!binary || !fs.existsSync(WHISPER_MODEL_PATH)) {
      return resolve({ success: false, error: "Voice input is not set up yet." });
    }

    const tmpId   = crypto.randomBytes(6).toString("hex");
    const wavPath = path.join(os.tmpdir(), `pulse-voice-${tmpId}.wav`);
    const outBase = path.join(os.tmpdir(), `pulse-voice-${tmpId}`);
    const txtPath = outBase + ".txt";

    function cleanup() {
      try { fs.unlinkSync(wavPath); } catch {}
      try { fs.unlinkSync(txtPath); } catch {}
    }

    try {
      fs.writeFileSync(wavPath, Buffer.from(wavBytes));
    } catch (err) {
      return resolve({ success: false, error: "Could not save recording: " + err.message });
    }

    const args = [
      "-m", WHISPER_MODEL_PATH,
      "-f", wavPath,
      "-l", "en",
      "-nt",          // no timestamps in the output text
      "-otxt",        // write a plain .txt transcript
      "-of", outBase, // output basename — whisper-cli appends .txt
    ];

    const proc = spawn(binary, args, { cwd: WHISPER_BIN_DIR, stdio: "ignore", shell: false });
    proc.on("error", (err) => {
      cleanup();
      resolve({ success: false, error: "Voice engine failed to start: " + err.message });
    });
    proc.on("close", (code) => {
      try {
        if (fs.existsSync(txtPath)) {
          const text = fs.readFileSync(txtPath, "utf8").trim();
          cleanup();
          return resolve({ success: true, text });
        }
        cleanup();
        resolve({ success: false, error: `Transcription failed (exit code ${code}).` });
      } catch (err) {
        cleanup();
        resolve({ success: false, error: "Could not read transcript: " + err.message });
      }
    });
  });
}

// ─── Next.js via utilityProcess ───────────────────────────────────────────────
// IMPORTANT: do not pass PORT: "0" here expecting a true OS-assigned port.
// Next.js's generated standalone server.js does:
//     const currentPort = parseInt(process.env.PORT, 10) || 3000
// parseInt("0", 10) is the *number* 0, which is falsy in JS, so the "|| 3000"
// fallback silently wins and the server always binds to the hardcoded 3000 —
// completely ignoring the "0 means OS-assigned" intent. That's been the
// actual root cause of the long-running /app 404 investigation: Pulse was
// always hard-bound to the single most common dev port on the machine, with
// no protection against another process (a totally unrelated dev server,
// in this case) also sitting on 3000. Windows doesn't enforce exclusive port
// binding for plain Node sockets by default, so two processes can both end
// up "successfully" listening on 127.0.0.1:3000, and the OS hands incoming
// connections to whichever one it picks per-connection — explaining requests
// that sometimes hit Pulse's middleware and sometimes silently 404 against
// a server that has no idea what "/app" is.
//
// Fix: choose an available unusual, non-default port before launching Next
// instead of relying on PORT=0. This sidesteps the parseInt-falsy-zero bug
// while still avoiding stale process collisions.
const PULSE_PORT_START = parseInt(process.env.PULSE_PORT_START || "58217", 10);

function startNextJS() {
  return new Promise(async (resolve, reject) => {
    const standalonePath = path.join(process.resourcesPath, "standalone");
    const serverScript   = path.join(standalonePath, "server.js");

    if (!fs.existsSync(serverScript)) {
      return reject(new Error(`server.js not found at: ${serverScript}`));
    }

    const selectedPort = await findAvailablePort(PULSE_PORT_START);
    console.log(`[Pulse] Starting Next.js on port ${selectedPort}`);

    const nextEnv = {
      ...process.env,
      PORT: String(selectedPort),
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PUBLIC_MOCK_MODE: process.env.NEXT_PUBLIC_MOCK_MODE || "false",
    };
    // Next standalone's generated server.js treats HOSTNAME specially. In the
    // packaged Electron child it can be inherited as 127.0.0.1, which makes
    // Next proxy requests back to http://localhost:<port> and fail against its
    // own listener. Deleting it forces the standalone server onto Next's normal
    // 0.0.0.0/default host path, which is the verified working mode.
    delete nextEnv.HOSTNAME;
    // Packaged Electron rejects most NODE_OPTIONS; passing it only adds noise
    // and can prevent the child from using the exact env we intend.
    delete nextEnv.NODE_OPTIONS;

    nextProcess = utilityProcess.fork(serverScript, [], {
      cwd: standalonePath,
      env: nextEnv,
      stdio: "pipe",
    });

    let resolved = false;
    let stdoutBuffer = "";

    if (nextProcess.stdout) {
      nextProcess.stdout.on("data", (data) => {
        const out = data.toString();
        console.log("[Next]", out.trim());
        stdoutBuffer += out;

        if (!resolved) {
          // Next.js standalone logs e.g. "- Local: http://127.0.0.1:54213"
          const match = stdoutBuffer.match(/https?:\/\/(?:127\.0\.0\.1|localhost)\:(\d+)/);
          if (match) {
            const boundPort = parseInt(match[1], 10);
            resolved = true;
            resolve(boundPort);
          }
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
    setTimeout(() => {
      if (!resolved) reject(new Error("Next.js did not report a bound port within 25s"));
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

// ─── License window ───────────────────────────────────────────────────────
// Shown before setup/main app if no verified license is stored on disk.
// Loads the standalone license.html (no Next.js server involved) and exposes
// verifyLicense() via preload, which round-trips to /api/desktop/verify.
function createLicenseWindow() {
  const icon = loadIcon();
  const win = new BrowserWindow({
    width: 480, height: 560,
    resizable: false, center: true,
    show: false, title: "Activate Pulse",
    backgroundColor: "#0a0f1e",
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadFile(path.join(__dirname, "license.html"));

  win.webContents.on("did-fail-load", (_e, errorCode, errorDescription, validatedURL) => {
    console.error("[Pulse] licenseWindow failed to load:", errorCode, errorDescription, validatedURL);
  });

  win.once("ready-to-show", () => {
    closeLoading();
    win.show();
    win.focus();
  });

  return win;
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

  setupWindow.webContents.on("did-fail-load", (_e, errorCode, errorDescription, validatedURL) => {
    console.error("[Pulse] setupWindow failed to load:", errorCode, errorDescription, validatedURL);
  });
  setupWindow.webContents.on("console-message", (_e, level, message, line, sourceId) => {
    console.log("[Pulse][setupWindow console]", level, message, "at", sourceId + ":" + line);
  });

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

  console.log(`[Pulse] mainWindow loading http://127.0.0.1:${port}/app`);
  mainWindow.loadURL(`http://127.0.0.1:${port}/app`);

  mainWindow.webContents.on("did-fail-load", (_e, errorCode, errorDescription, validatedURL) => {
    console.error("[Pulse] mainWindow failed to load:", errorCode, errorDescription, validatedURL);
  });
  mainWindow.webContents.on("console-message", (_e, level, message, line, sourceId) => {
    console.log("[Pulse][mainWindow console]", level, message, "at", sourceId + ":" + line);
  });

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
    {
      label: "Reset Setup (testing)",
      click: () => {
        try {
          writeConfig({ setupComplete: false });
          console.log("[Pulse] Setup reset via tray menu — relaunch to see the wizard again.");
        } catch (e) {
          console.error("[Pulse] Reset Setup failed:", e.message);
        }
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
const SALESFORCE_CLIENT_ID = process.env.SALESFORCE_CLIENT_ID || "";
const HUBSPOT_CLIENT_ID    = ""; // unused — HubSpot uses private app tokens
const TIKTOK_APP_ID        = process.env.TIKTOK_APP_ID        || "";

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

function buildSalesforceAuthUrl(state) {
  const params = new url.URLSearchParams({
    client_id: SALESFORCE_CLIENT_ID,
    redirect_uri: OAUTH_REDIRECT_URI,
    response_type: "code",
    scope: "api refresh_token offline_access",
    state,
  });
  return `https://login.salesforce.com/services/oauth2/authorize?${params}`;
}

function buildHubSpotAuthUrl(state, codeChallenge) {
  const params = new url.URLSearchParams({
    client_id: HUBSPOT_CLIENT_ID,
    redirect_uri: OAUTH_REDIRECT_URI,
    scope: "crm.objects.contacts.read crm.objects.deals.read crm.objects.companies.read",
    state,
    response_type: "code",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `https://app.hubspot.com/oauth/authorize?${params}`;
}

function buildTikTokAuthUrl(state) {
  const params = new url.URLSearchParams({
    app_id: TIKTOK_APP_ID,
    redirect_uri: OAUTH_REDIRECT_URI,
    state,
    scope: "ad_account:readonly",
    response_type: "code",
  });
  return `https://business-api.tiktok.com/portal/auth?${params}`;
}

async function forwardCodeToApp(provider, code, userId, codeVerifier) {
  return new Promise((resolve, reject) => {
    let cbPath;
    if (provider === "google") {
      cbPath = `/api/integrations/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(userId)}`;
    } else if (provider === "salesforce") {
      cbPath = `/api/integrations/salesforce/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(userId)}`;
    } else if (provider === "hubspot") {
      cbPath = `/api/integrations/hubspot/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(userId)}&code_verifier=${encodeURIComponent(codeVerifier || "")}`;
    } else if (provider === "tiktok") {
      cbPath = `/api/integrations/tiktok/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(userId)}`;
    } else {
      cbPath = `/api/integrations/meta/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(userId)}`;
    }

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

    // PKCE for HubSpot OAuth 2.1
    let codeVerifier = null;
    let codeChallenge = null;
    if (provider === "hubspot") {
      codeVerifier = crypto.randomBytes(32).toString("base64url");
      codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
    }

    function finish(result) {
      if (settled) return;
      settled = true;
      try { redirectServer && redirectServer.close(); } catch {}
      resolve(result);
    }

    let authUrl;
    if (provider === "google")           authUrl = buildGoogleAuthUrl(state);
    else if (provider === "salesforce")  authUrl = buildSalesforceAuthUrl(state);
    else if (provider === "hubspot")     authUrl = buildHubSpotAuthUrl(state, codeChallenge);
    else if (provider === "tiktok")      authUrl = buildTikTokAuthUrl(state);
    else                                 authUrl = buildMetaAuthUrl(state);
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
        await forwardCodeToApp(provider, code, "setup_pending", codeVerifier);
        // Salesforce/HubSpot connection is confirmed server-side; mark locally too
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
    ? `${{ google: "Google", salesforce: "Salesforce", hubspot: "HubSpot", tiktok: "TikTok Ads" }[provider] ?? "Meta"} connected. You can close this tab.`
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

ipcMain.handle("license:verify", async (_e, email) => {
  try {
    const result = await verifyLicenseEmail(email);
    if (result.valid) {
      writeConfig({ license: { verified: true, email: result.email, plan: result.plan }, userId: result.userId });
      // Give the renderer a moment to show its success state, then advance
      // to setup or the main app exactly like a normal cold start would.
      setTimeout(() => {
        if (licenseWindow && !licenseWindow.isDestroyed()) {
          licenseWindow.close();
          licenseWindow = null;
        }
        if (isSetupComplete()) {
          createMainWindow(activePort);
        } else {
          createSetupWindow();
        }
      }, 1200);
    }
    return result;
  } catch (err) {
    return { valid: false, reason: "server_error" };
  }
});

// ─── Whisper IPC handlers ────────────────────────────────────────────────────

ipcMain.handle("whisper:status", async () => {
  return { ready: isWhisperReady() };
});

ipcMain.handle("whisper:install", async (_e) => {
  const win = setupWindow || mainWindow;
  const sendProgress = (pct, label) => {
    if (win && !win.isDestroyed()) win.webContents.send("whisper:progress", { pct, label });
  };
  return installWhisper(sendProgress);
});

ipcMain.handle("whisper:transcribe", async (_e, wavBytes) => {
  return transcribeAudio(wavBytes);
});

// ─── Audio device enumeration (for device picker in Vocal Mode settings) ─────
// We ask the renderer to enumerate devices via a round-trip IPC because
// navigator.mediaDevices is only available in the BrowserWindow renderer
// context, not in the main process. The renderer calls pulse.listAudioDevices()
// which sends the result of navigator.mediaDevices.enumerateDevices() back.
ipcMain.handle("audio:getDevices", async (_e) => {
  // This is forwarded from the renderer — see preload.js. Main process just
  // stores the last known device list sent by the renderer via "audio:devices".
  return audioDeviceCache || [];
});

let audioDeviceCache = null;
ipcMain.on("audio:reportDevices", (_e, devices) => {
  audioDeviceCache = devices;
});

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
      await startOllama();
      activePort = await startNextJS();
      console.log(`[Pulse] Next.js bound to port ${activePort}`);
      await waitForNextJS(activePort);
    }

    createTray();

    if (!getStoredLicenseEmail()) {
      licenseWindow = createLicenseWindow();
      licenseWindow.on("closed", () => { licenseWindow = null; });
    } else if (isSetupComplete()) {
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
