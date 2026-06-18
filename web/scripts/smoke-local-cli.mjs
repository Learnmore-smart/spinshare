#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  processTreeKillCommand,
  readLocalSampleAccessToken,
} from "./smoke-local-sample.mjs";

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const LOCAL_SAMPLE_AD_TEXT = "SpinShare Local - sample ad for localhost testing";
const REQUEST_TIMEOUT_MS = 15_000;
const STARTUP_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 1_000;
export const CLI_SMOKE_TIMEOUT_MS = 20_000;

export function isLocalCliAdOutput(output) {
  return typeof output === "string" && output.includes(LOCAL_SAMPLE_AD_TEXT);
}

export function cliSmokeCommand(nodeExecutable = process.execPath) {
  return {
    command: nodeExecutable,
    args: [
      "cli-wrapper/dist/index.js",
      "node",
      "cli-wrapper/fake-ai.js",
    ],
  };
}

function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(
        new Error(
          `Command timed out after ${CLI_SMOKE_TIMEOUT_MS}ms: ${command} ${args.join(" ")}\n--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`,
        ),
      );
    }, CLI_SMOKE_TIMEOUT_MS);

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timeout);
      resolve({ code: code ?? 0, signal, stdout, stderr });
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`${url} returned ${response.status}: ${text}`);
    }
    return text.length > 0 ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const health = await fetchJson(`${baseUrl}/api/health`, REQUEST_TIMEOUT_MS);
      if (health?.status === "ok") {
        return health;
      }
    } catch (error) {
      lastError = error;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw lastError ?? new Error("Timed out waiting for local sample health.");
}

function startLocalSampleServer(cwd) {
  return spawn(process.execPath, ["web/scripts/dev-local-sample.mjs"], {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

async function waitForClose(child, timeoutMs = 5_000) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, timeoutMs);
    child.once("close", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function stopLocalSampleServer(child) {
  if (child.exitCode === null && child.signalCode === null) {
    const kill = processTreeKillCommand(process.platform, child.pid);
    if (kill !== null) {
      await runCommand(kill.command, kill.args, { cwd: process.cwd() }).catch(
        () => null,
      );
    } else {
      child.kill("SIGTERM");
    }
  }
  child.stdout?.destroy();
  child.stderr?.destroy();
  await waitForClose(child);
}

export async function runLocalCliSmoke({
  baseUrl = DEFAULT_BASE_URL,
  cwd = fileURLToPath(new URL("../..", import.meta.url)),
  log = console.log,
} = {}) {
  const server = startLocalSampleServer(cwd);
  const output = [];
  server.stdout?.on("data", (chunk) => output.push(chunk.toString("utf8")));
  server.stderr?.on("data", (chunk) => output.push(chunk.toString("utf8")));

  try {
    await waitForHealth(baseUrl);
    const accessToken = await readLocalSampleAccessToken(baseUrl);
    const { command, args } = cliSmokeCommand();
    const result = await runCommand(command, args, {
      cwd,
      env: {
        ...process.env,
        SPINSHARE_BASE_URL: baseUrl,
        SPINSHARE_API_URL: baseUrl,
        SPINSHARE_TOKEN: accessToken,
      },
    });

    if (result.code !== 0) {
      throw new Error(
        `CLI smoke exited ${result.code} ${result.signal ?? ""}\n${result.stderr}`,
      );
    }
    if (!isLocalCliAdOutput(result.stdout)) {
      throw new Error(
        `CLI smoke did not render the local sample ad.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`,
      );
    }

    const summary = {
      exitCode: result.code,
      renderedLocalAd: true,
    };
    log(`cli=${JSON.stringify(summary)}`);
    return summary;
  } catch (error) {
    const tail = output.join("").split(/\r?\n/).slice(-80).join("\n");
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}\n\n--- dev:sample output tail ---\n${tail}`);
  } finally {
    await stopLocalSampleServer(server);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runLocalCliSmoke()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
