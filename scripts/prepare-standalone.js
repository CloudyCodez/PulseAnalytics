const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const standaloneDir = path.join(root, ".next", "standalone");
const envSource = path.join(root, ".env.local");
const envDest = path.join(standaloneDir, ".env.local");

if (!fs.existsSync(standaloneDir)) {
  console.error("[prepare-standalone] Missing .next/standalone. Run next build first.");
  process.exit(1);
}

if (fs.existsSync(envSource)) {
  fs.copyFileSync(envSource, envDest);
  console.log("[prepare-standalone] Copied .env.local into .next/standalone.");
} else {
  console.warn("[prepare-standalone] No .env.local found; standalone will require env vars from the parent process.");
}
