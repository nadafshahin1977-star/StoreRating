import { spawn } from "node:child_process";
import path from "node:path";

const isWindows = process.platform === "win32";
const npxCmd = isWindows ? "npx.cmd" : "npx";

console.log("\n🚀 Starting StoreRate Full-Stack Development Environment...\n");

// Start API Server
const apiProcess = spawn(npxCmd, ["tsx", "artifacts/api-server/src/index.ts"], {
  stdio: "inherit",
  env: { ...process.env, PORT: "5000" },
  shell: isWindows,
});

// Start Frontend Dev Server
const viteProcess = spawn(
  npxCmd,
  ["vite", "--config", "artifacts/store-rate/vite.config.ts", "--host", "0.0.0.0", "--port", "3000"],
  {
    cwd: path.resolve("artifacts/store-rate"),
    stdio: "inherit",
    env: { ...process.env, PORT: "3000", BASE_PATH: "/", API_URL: "http://localhost:5000" },
    shell: isWindows,
  }
);

function cleanup() {
  console.log("\n🛑 Shutting down StoreRate services...");
  apiProcess.kill();
  viteProcess.kill();
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
