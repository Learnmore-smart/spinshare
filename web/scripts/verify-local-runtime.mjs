#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseDotEnv, runPreflightChecks } from "./verify-local-runtime-core.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
const DEFAULT_ENV_FILE = path.join(REPO_ROOT, ".env");

function parseArgs(argv) {
  const args = { envFile: DEFAULT_ENV_FILE, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") {
      args.json = true;
    } else if (arg === "--env-file") {
      const next = argv[i + 1];
      if (!next) throw new Error("--env-file requires a path");
      args.envFile = path.resolve(next);
      i += 1;
    } else if (arg.startsWith("--env-file=")) {
      args.envFile = path.resolve(arg.slice("--env-file=".length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

async function loadEnv(envFile) {
  let fileEnv = {};
  try {
    fileEnv = parseDotEnv(await readFile(envFile, "utf8"));
  } catch {
    fileEnv = {};
  }
  return { ...fileEnv, ...process.env };
}

function printText(results) {
  for (const item of results) {
    const marker = item.ok ? "PASS" : item.severity === "warning" ? "WARN" : "FAIL";
    console.log(`${marker} ${item.name}: ${item.detail}`);
  }
  console.log("");
  console.log("Next real verification commands:");
  console.log("- Claude Code: corepack pnpm@9.12.0 cli:login:local; claude");
  console.log("- Stripe webhook: stripe listen --forward-to http://localhost:3000/api/webhooks/stripe");
  console.log("- Firestore emulator: corepack pnpm@9.12.0 emulators");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = await loadEnv(args.envFile);
  const results = await runPreflightChecks({ env });
  if (args.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    printText(results);
  }
  if (results.some((item) => !item.ok && item.severity !== "warning")) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
