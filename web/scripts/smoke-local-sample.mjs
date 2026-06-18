#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const STARTUP_TIMEOUT_MS = 90_000;
const REQUEST_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 1_000;
const EXPECTED_CAMPAIGN_ID = "cmp-local-demo";
const EXPECTED_AD_TEXT = "SpinShare Local - sample ad for localhost testing";
const EXPECTED_BRAND_NAME = "SpinShare Local";
const LOCAL_DEVELOPER_EMAIL = "developer@spinshare.test";
const LOCAL_DEVELOPER_PASSWORD = "spinshare";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRecord(value) {
  return typeof value === "object" && value !== null;
}

export function isLocalSampleMarketResponse(body) {
  if (!isRecord(body) || !Array.isArray(body.rows) || !isRecord(body.summary)) {
    return false;
  }

  const firstRow = body.rows[0];
  return (
    isRecord(firstRow) &&
    firstRow.id === EXPECTED_CAMPAIGN_ID &&
    firstRow.adText === EXPECTED_AD_TEXT &&
    typeof firstRow.bidLabel === "string" &&
    typeof firstRow.remainingBudgetUsd === "string" &&
    body.summary.liveCampaigns === 1
  );
}

export function summarizeLocalSampleMarket(body) {
  if (!isLocalSampleMarketResponse(body)) {
    throw new Error("Market response does not contain the local sample campaign.");
  }

  const firstRow = body.rows[0];
  return {
    liveCampaigns: body.summary.liveCampaigns,
    campaignId: firstRow.id,
    adText: firstRow.adText,
    bidLabel: firstRow.bidLabel,
    remainingBudgetUsd: firstRow.remainingBudgetUsd,
  };
}

export function isLocalSampleAdResponse(body) {
  if (!isRecord(body) || body.adAvailable !== true) {
    return false;
  }
  if (
    body.campaignId !== EXPECTED_CAMPAIGN_ID ||
    body.adText !== EXPECTED_AD_TEXT ||
    body.brandName !== EXPECTED_BRAND_NAME ||
    typeof body.destinationUrl !== "string"
  ) {
    return false;
  }

  try {
    const destination = new URL(body.destinationUrl);
    return (
      destination.pathname === "/api/click" &&
      destination.searchParams.get("campaignId") === EXPECTED_CAMPAIGN_ID &&
      Boolean(destination.searchParams.get("clickToken"))
    );
  } catch {
    return false;
  }
}

export function summarizeLocalSampleAd(body) {
  if (!isLocalSampleAdResponse(body)) {
    throw new Error("Ad response does not contain the local sample campaign.");
  }

  const destination = new URL(body.destinationUrl);
  return {
    campaignId: body.campaignId,
    adText: body.adText,
    brandName: body.brandName,
    cpmUsd: body.cpmUsd,
    destinationHost: destination.host,
  };
}

function readSetCookieHeaders(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }
  const singleHeader = headers.get("set-cookie");
  return singleHeader ? [singleHeader] : [];
}

function createCookieFetch(fetchImpl = fetch) {
  const cookies = new Map();

  function cookieHeader() {
    return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  function storeCookies(headers) {
    for (const header of readSetCookieHeaders(headers)) {
      const [pair] = header.split(";");
      const separatorIndex = pair.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }
      cookies.set(pair.slice(0, separatorIndex), pair.slice(separatorIndex + 1));
    }
  }

  return async (url, init = {}) => {
    const headers = new Headers(init.headers ?? {});
    const cookie = cookieHeader();
    if (cookie.length > 0) {
      headers.set("cookie", cookie);
    }
    const response = await fetchImpl(url, { ...init, headers });
    storeCookies(response.headers);
    return response;
  };
}

export function jsonPostInit(body) {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

async function fetchJson(url, timeoutMs, fetchImpl = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      cache: "no-store",
      signal: controller.signal,
    });
    const text = await response.text();
    let body = null;
    try {
      body = text.length > 0 ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    if (!response.ok) {
      throw new Error(`${url} returned ${response.status}: ${text}`);
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

async function signInLocalDeveloper(baseUrl, fetchImpl) {
  const csrf = await fetchJson(
    `${baseUrl}/api/auth/csrf`,
    REQUEST_TIMEOUT_MS,
    fetchImpl,
  );
  if (!isRecord(csrf) || typeof csrf.csrfToken !== "string") {
    throw new Error("Could not read local credentials CSRF token.");
  }

  const form = new URLSearchParams({
    csrfToken: csrf.csrfToken,
    email: LOCAL_DEVELOPER_EMAIL,
    password: LOCAL_DEVELOPER_PASSWORD,
    json: "true",
  });
  const response = await fetchImpl(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    redirect: "manual",
  });
  if (response.status < 200 || response.status >= 400) {
    throw new Error(`Local credentials sign-in failed with ${response.status}.`);
  }
}

async function approveLocalDeviceAndReadToken(baseUrl, fetchImpl) {
  const start = await fetchJson(
    `${baseUrl}/api/auth/device/start`,
    REQUEST_TIMEOUT_MS,
    (url, init = {}) =>
      fetchImpl(url, {
        ...init,
        ...jsonPostInit({}),
        headers: {
          ...(init.headers ?? {}),
          ...jsonPostInit({}).headers,
        },
      }),
  );
  if (
    !isRecord(start) ||
    typeof start.deviceCode !== "string" ||
    typeof start.userCode !== "string"
  ) {
    throw new Error("Device start did not return deviceCode/userCode.");
  }

  const approve = await fetchJson(
    `${baseUrl}/api/auth/device/approve`,
    REQUEST_TIMEOUT_MS,
    (url, init = {}) =>
      fetchImpl(url, {
        ...init,
        ...jsonPostInit({
          userCode: start.userCode,
          decision: "approve",
        }),
        headers: {
          ...(init.headers ?? {}),
          ...jsonPostInit({}).headers,
        },
      }),
  );
  if (!isRecord(approve) || approve.approved !== true) {
    throw new Error("Device approval did not succeed.");
  }

  const token = await fetchJson(
    `${baseUrl}/api/auth/device/token`,
    REQUEST_TIMEOUT_MS,
    (url, init = {}) =>
      fetchImpl(url, {
        ...init,
        ...jsonPostInit({ deviceCode: start.deviceCode }),
        headers: {
          ...(init.headers ?? {}),
          ...jsonPostInit({}).headers,
        },
      }),
  );
  if (!isRecord(token) || typeof token.accessToken !== "string") {
    throw new Error("Device token poll did not return an access token.");
  }
  return token.accessToken;
}

export async function readLocalSampleAccessToken(baseUrl, fetchImpl = fetch) {
  const cookieFetch = createCookieFetch(fetchImpl);
  await signInLocalDeveloper(baseUrl, cookieFetch);
  return approveLocalDeviceAndReadToken(baseUrl, cookieFetch);
}

async function waitForHealth(baseUrl, timeoutMs, fetchImpl) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const health = await fetchJson(
        `${baseUrl}/api/health`,
        REQUEST_TIMEOUT_MS,
        fetchImpl,
      );
      if (isRecord(health) && health.status === "ok") {
        return health;
      }
      lastError = new Error("Health endpoint did not return status ok.");
    } catch (error) {
      lastError = error;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  throw lastError ?? new Error("Timed out waiting for local sample health.");
}

export function processTreeKillCommand(platform, pid) {
  if (platform !== "win32") {
    return null;
  }
  return {
    command: "taskkill.exe",
    args: ["/pid", String(pid), "/t", "/f"],
  };
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

async function stopProcessTree(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  const command = processTreeKillCommand(process.platform, child.pid);
  if (command !== null) {
    spawnSync(command.command, command.args, {
      stdio: "ignore",
      timeout: 5_000,
    });
  } else {
    child.kill("SIGTERM");
  }

  child.stdout?.destroy();
  child.stderr?.destroy();
  await waitForClose(child);
}

function createServerProcess(cwd) {
  return spawn(process.execPath, ["web/scripts/dev-local-sample.mjs"], {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

export async function runLocalSampleSmoke({
  baseUrl = DEFAULT_BASE_URL,
  startupTimeoutMs = STARTUP_TIMEOUT_MS,
  cwd = fileURLToPath(new URL("../..", import.meta.url)),
  fetchImpl = fetch,
  log = console.log,
} = {}) {
  const child = createServerProcess(cwd);
  const output = [];
  child.stdout?.on("data", (chunk) => output.push(chunk.toString("utf8")));
  child.stderr?.on("data", (chunk) => output.push(chunk.toString("utf8")));

  try {
    const health = await waitForHealth(baseUrl, startupTimeoutMs, fetchImpl);
    const market = await fetchJson(
      `${baseUrl}/api/market`,
      REQUEST_TIMEOUT_MS,
      fetchImpl,
    );
    const summary = summarizeLocalSampleMarket(market);
    const accessToken = await readLocalSampleAccessToken(baseUrl, fetchImpl);
    const ad = await fetchJson(
      `${baseUrl}/api/ad`,
      REQUEST_TIMEOUT_MS,
      (url, init = {}) =>
        fetchImpl(url, {
          ...init,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(init.headers ?? {}),
          },
        }),
    );
    const adSummary = summarizeLocalSampleAd(ad);
    log(`health=${JSON.stringify(health)}`);
    log(`market=${JSON.stringify(summary)}`);
    log(`ad=${JSON.stringify(adSummary)}`);
    return { health, market: summary, ad: adSummary };
  } catch (error) {
    const tail = output.join("").split(/\r?\n/).slice(-80).join("\n");
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}\n\n--- dev:sample output tail ---\n${tail}`);
  } finally {
    await stopProcessTree(child);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runLocalSampleSmoke()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
