#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  jsonPostInit,
  processTreeKillCommand,
  readLocalSampleAccessToken,
} from "./smoke-local-sample.mjs";

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const STARTUP_TIMEOUT_MS = 90_000;
const REQUEST_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 1_000;

const PURCHASED_AD_TEXT = "SpinShare Checkout Smoke - funded local purchase";
const PURCHASED_BRAND_NAME = "Checkout Smoke";
const PURCHASED_DESTINATION_URL = "https://www.spinshare.dev/checkout-smoke";
const PURCHASED_ADVERTISER_EMAIL = "advertiser@spinshare.test";
const PURCHASED_ADVERTISER_PASSWORD = "spinshare";
const PURCHASED_CPM_CENTS = 5_000;
const PURCHASED_BLOCK_COUNT = 1;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRecord(value) {
  return typeof value === "object" && value !== null;
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

async function fetchJson(url, timeoutMs, fetchImpl = fetch, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      cache: "no-store",
      ...init,
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

async function signInLocalUser(baseUrl, fetchImpl, email, password) {
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
    email,
    password,
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
    fetchImpl,
    jsonPostInit({}),
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
    fetchImpl,
    jsonPostInit({
      userCode: start.userCode,
      decision: "approve",
    }),
  );
  if (!isRecord(approve) || approve.approved !== true) {
    throw new Error("Device approval did not succeed.");
  }

  const token = await fetchJson(
    `${baseUrl}/api/auth/device/token`,
    REQUEST_TIMEOUT_MS,
    fetchImpl,
    jsonPostInit({ deviceCode: start.deviceCode }),
  );
  if (!isRecord(token) || typeof token.accessToken !== "string") {
    throw new Error("Device token poll did not return an access token.");
  }
  return token.accessToken;
}

async function readLocalUserAccessToken(
  baseUrl,
  { email, password },
  fetchImpl = fetch,
) {
  const cookieFetch = createCookieFetch(fetchImpl);
  await signInLocalUser(baseUrl, cookieFetch, email, password);
  return approveLocalDeviceAndReadToken(baseUrl, cookieFetch);
}

function authFetch(fetchImpl, token) {
  return (url, init = {}) =>
    fetchImpl(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
}

export function isPurchasedCheckoutResponse(body, campaignId) {
  if (!isRecord(body) || !isRecord(body.campaign)) {
    return false;
  }
  if (campaignId !== undefined && body.campaign.id !== campaignId) {
    return false;
  }
  return (
    body.settled === true &&
    typeof body.sessionId === "string" &&
    body.sessionId.length > 0 &&
    body.amountCents === PURCHASED_CPM_CENTS * PURCHASED_BLOCK_COUNT &&
    body.campaign.adText === PURCHASED_AD_TEXT &&
    body.campaign.brandName === PURCHASED_BRAND_NAME &&
    body.campaign.cpmCents === PURCHASED_CPM_CENTS &&
    body.campaign.budgetCents >= body.amountCents &&
    body.campaign.publicOnLeaderboard !== false
  );
}

export function summarizePurchasedCheckout(body, campaignId) {
  if (!isPurchasedCheckoutResponse(body, campaignId)) {
    throw new Error("Checkout response does not contain a settled purchased campaign.");
  }

  return {
    campaignId: body.campaign.id,
    sessionId: body.sessionId,
    amountCents: body.amountCents,
    cpmCents: body.campaign.cpmCents,
    budgetCents: body.campaign.budgetCents,
    settled: body.settled,
  };
}

function findCampaignRow(body, campaignId) {
  if (!isRecord(body) || !Array.isArray(body.rows)) {
    return null;
  }
  return body.rows.find((row) => isRecord(row) && row.id === campaignId) ?? null;
}

export function isPurchasedCampaignMarketResponse(body, campaignId) {
  const row = findCampaignRow(body, campaignId);
  return (
    row !== null &&
    row.adText === PURCHASED_AD_TEXT &&
    row.cpmCents === PURCHASED_CPM_CENTS &&
    typeof row.bidLabel === "string" &&
    typeof row.rank === "number" &&
    isRecord(body.summary) &&
    body.summary.liveCampaigns >= 1
  );
}

export function summarizePurchasedCampaignMarket(body, campaignId) {
  if (!isPurchasedCampaignMarketResponse(body, campaignId)) {
    throw new Error("Market response does not contain the purchased campaign.");
  }
  const row = findCampaignRow(body, campaignId);
  return {
    liveCampaigns: body.summary.liveCampaigns,
    campaignId: row.id,
    rank: row.rank,
    bidLabel: row.bidLabel,
    cpmCents: row.cpmCents,
  };
}

export function isPurchasedCampaignAdResponse(body, campaignId) {
  if (!isRecord(body) || body.adAvailable !== true) {
    return false;
  }
  if (
    body.campaignId !== campaignId ||
    body.adText !== PURCHASED_AD_TEXT ||
    body.brandName !== PURCHASED_BRAND_NAME ||
    typeof body.destinationUrl !== "string"
  ) {
    return false;
  }

  try {
    const destination = new URL(body.destinationUrl);
    return (
      destination.pathname === "/api/click" &&
      destination.searchParams.get("campaignId") === campaignId &&
      Boolean(destination.searchParams.get("clickToken"))
    );
  } catch {
    return false;
  }
}

export function summarizePurchasedCampaignAd(body, campaignId) {
  if (!isPurchasedCampaignAdResponse(body, campaignId)) {
    throw new Error("Ad response does not select the purchased campaign.");
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

function findDashboardCampaign(body, campaignId) {
  if (!isRecord(body) || !Array.isArray(body.campaigns)) {
    return null;
  }
  return body.campaigns.find((campaign) => isRecord(campaign) && campaign.id === campaignId) ?? null;
}

function campaignTelemetry(campaign) {
  return isRecord(campaign?.telemetry) ? campaign.telemetry : {};
}

export function isPurchasedCampaignDashboardResponse(body, campaignId) {
  const campaign = findDashboardCampaign(body, campaignId);
  return (
    campaign !== null &&
    campaign.adText === PURCHASED_AD_TEXT &&
    campaign.cpmCents === PURCHASED_CPM_CENTS &&
    campaign.budgetCents > 0 &&
    campaign.publicOnLeaderboard !== false
  );
}

export function summarizePurchasedCampaignDashboard(body, campaignId) {
  if (!isPurchasedCampaignDashboardResponse(body, campaignId)) {
    throw new Error("Advertiser dashboard response does not contain the purchased campaign.");
  }

  const campaign = findDashboardCampaign(body, campaignId);
  const telemetry = campaignTelemetry(campaign);
  return {
    campaignId: campaign.id,
    budgetCents: campaign.budgetCents,
    cpmCents: campaign.cpmCents,
    shows: telemetry.shows ?? 0,
    credited: telemetry.credited ?? 0,
    clicks: telemetry.clicks ?? 0,
  };
}

export function isPurchasedCampaignActivityResponse(body, campaignId, sessionId) {
  if (!isRecord(body) || !Array.isArray(body.activities)) {
    return false;
  }

  const statuses = new Set();
  for (const activity of body.activities) {
    if (
      isRecord(activity) &&
      activity.campaignId === campaignId &&
      activity.checkoutSessionId === sessionId
    ) {
      statuses.add(activity.status);
    }
  }
  return statuses.has("checkoutStarted") && statuses.has("budgetFunded");
}

export function summarizePurchasedCampaignActivity(body, campaignId, sessionId) {
  if (!isPurchasedCampaignActivityResponse(body, campaignId, sessionId)) {
    throw new Error("Advertiser activity response does not include checkout and funding rows.");
  }

  return {
    campaignId,
    sessionId,
    statuses: ["checkoutStarted", "budgetFunded"],
  };
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

async function createPurchasedCheckout(baseUrl, fetchImpl) {
  return fetchJson(
    `${baseUrl}/api/advertiser-checkout`,
    REQUEST_TIMEOUT_MS,
    fetchImpl,
    {
      ...jsonPostInit({
        email: PURCHASED_ADVERTISER_EMAIL,
        adText: PURCHASED_AD_TEXT,
        destinationUrl: PURCHASED_DESTINATION_URL,
        brandName: PURCHASED_BRAND_NAME,
        publicOnLeaderboard: true,
        cpmCents: PURCHASED_CPM_CENTS,
        blockCount: PURCHASED_BLOCK_COUNT,
      }),
    },
  );
}

export async function runLocalCheckoutSmoke({
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
    const checkout = await createPurchasedCheckout(baseUrl, fetchImpl);
    const checkoutSummary = summarizePurchasedCheckout(checkout);
    const { campaignId, sessionId } = checkoutSummary;

    const market = await fetchJson(
      `${baseUrl}/api/market`,
      REQUEST_TIMEOUT_MS,
      fetchImpl,
    );
    const marketSummary = summarizePurchasedCampaignMarket(market, campaignId);

    const developerToken = await readLocalSampleAccessToken(baseUrl, fetchImpl);
    const ad = await fetchJson(
      `${baseUrl}/api/ad`,
      REQUEST_TIMEOUT_MS,
      authFetch(fetchImpl, developerToken),
    );
    const adSummary = summarizePurchasedCampaignAd(ad, campaignId);

    const advertiserToken = await readLocalUserAccessToken(
      baseUrl,
      {
        email: PURCHASED_ADVERTISER_EMAIL,
        password: PURCHASED_ADVERTISER_PASSWORD,
      },
      fetchImpl,
    );
    const dashboard = await fetchJson(
      `${baseUrl}/api/campaigns`,
      REQUEST_TIMEOUT_MS,
      authFetch(fetchImpl, advertiserToken),
    );
    const dashboardSummary = summarizePurchasedCampaignDashboard(
      dashboard,
      campaignId,
    );

    const activity = await fetchJson(
      `${baseUrl}/api/activity/advertiser`,
      REQUEST_TIMEOUT_MS,
      authFetch(fetchImpl, advertiserToken),
    );
    const activitySummary = summarizePurchasedCampaignActivity(
      activity,
      campaignId,
      sessionId,
    );

    log(`health=${JSON.stringify(health)}`);
    log(`checkout=${JSON.stringify(checkoutSummary)}`);
    log(`market=${JSON.stringify(marketSummary)}`);
    log(`ad=${JSON.stringify(adSummary)}`);
    log(`campaigns=${JSON.stringify(dashboardSummary)}`);
    log(`activity=${JSON.stringify(activitySummary)}`);
    return {
      health,
      checkout: checkoutSummary,
      market: marketSummary,
      ad: adSummary,
      campaigns: dashboardSummary,
      activity: activitySummary,
    };
  } catch (error) {
    const tail = output.join("").split(/\r?\n/).slice(-80).join("\n");
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}\n\n--- dev:sample output tail ---\n${tail}`);
  } finally {
    await stopProcessTree(child);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runLocalCheckoutSmoke()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
