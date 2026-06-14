#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
const ENV_FILE = path.join(REPO_ROOT, ".env");

function parseDotEnvValue(raw) {
  let value = raw.trim();
  const quote = value[0];
  if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
    return value.slice(1, -1);
  }
  return value.replace(/\s+#.*$/, "").trim();
}

function parseDotEnv(contents) {
  const parsed = {};
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (!match) continue;
    parsed[match[1]] = parseDotEnvValue(match[2] ?? "");
  }
  return parsed;
}

async function resolveProjectId() {
  const fileEnv = parseDotEnv(await readFile(ENV_FILE, "utf8"));
  const projectId = (process.env.FIREBASE_PROJECT_ID ?? fileEnv.FIREBASE_PROJECT_ID ?? "").trim();
  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID is missing from process env and .env");
  }
  return projectId;
}

function runFirebaseDeploy(projectId) {
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  const args = [
    "--yes",
    "firebase-tools",
    "deploy",
    "--only",
    "firestore:indexes",
    "--project",
    projectId,
    "--non-interactive",
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: REPO_ROOT,
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`firebase-tools exited with code ${code}`));
      }
    });
  });
}

try {
  const projectId = await resolveProjectId();
  await runFirebaseDeploy(projectId);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
