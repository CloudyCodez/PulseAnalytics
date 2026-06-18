/**
 * server-launcher.js
 *
 * This file is the bridge between Electron and the Next.js standalone server.
 * It runs as a CHILD PROCESS via Electron's own Node.js runtime (not the .exe).
 *
 * Electron ships with Node.js built in. We use the `--require` trick via
 * electron's utility process, OR we call this via the bundled node in
 * the Electron distribution.
 *
 * This file simply starts the Next.js standalone server.js and keeps alive.
 */

const path = require("path");
const port = process.env.PORT || "3000";

process.env.PORT = port;

// Load the Next.js standalone server
require("./server.js");
