/**
 * Run the SpinShare CLI against a local dev server (http://localhost:3000).
 * Usage: node cli-wrapper/scripts/run-local.mjs login
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node cli-wrapper/scripts/run-local.mjs <cli-args...>");
  process.exit(1);
}

const env = {
  ...process.env,
  SPINSHARE_BASE_URL: process.env.SPINSHARE_BASE_URL ?? "http://localhost:3000",
};

const result = spawnSync("node", [join(root, "dist/index.js"), ...args], {
  stdio: "inherit",
  env,
  cwd: root,
});

process.exit(result.status ?? 1);
