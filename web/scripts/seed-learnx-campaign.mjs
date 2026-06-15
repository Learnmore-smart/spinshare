#!/usr/bin/env node
/**
 * Upserts a funded LearnX demo campaign into Firestore for local extension testing.
 *
 * Run from repo root:
 *   node web/scripts/seed-learnx-campaign.mjs
 *
 * Requires FIREBASE_* service-account creds in repo-root `.env`.
 * Set SPINSHARE_USE_FIRESTORE=1 in `.env` and restart `pnpm dev` so the web app
 * reads this campaign via GET /api/ad.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
const ENV_FILE = path.join(REPO_ROOT, ".env");

const CAMPAIGN_ID = "cmp-learnx-demo";
const ADVERTISER_ID = "seed-learnx-advertiser";

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

async function loadEnv() {
  const fileEnv = parseDotEnv(await readFile(ENV_FILE, "utf8"));
  return { ...fileEnv, ...process.env };
}

function resolveCredential(env) {
  const projectId = (env.FIREBASE_PROJECT_ID ?? "").trim();
  const clientEmail = (env.FIREBASE_CLIENT_EMAIL ?? "").trim();
  const privateKey = (env.FIREBASE_PRIVATE_KEY ?? "").trim();
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY in .env",
    );
  }
  return {
    projectId,
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  };
}

function getDb(projectId, credential) {
  const appName = "spinshare-seed-learnx";
  const existing = getApps().find((app) => app.name === appName);
  const app =
    existing ??
    initializeApp(
      {
        projectId,
        credential,
      },
      appName,
    );
  return getFirestore(app);
}

async function main() {
  const env = await loadEnv();
  const { projectId, credential } = resolveCredential(env);
  const db = getDb(projectId, credential);
  const nowMs = Date.now();

  const campaign = {
    id: CAMPAIGN_ID,
    advertiserId: ADVERTISER_ID,
    adText: "LearnX · Know exactly what to study",
    brandName: "LearnX",
    destinationUrl: "https://www.learnx.pro",
    publicOnLeaderboard: true,
    cpmCents: 3_000,
    budgetCents: 5_000,
    status: "active",
    createdAtMs: nowMs,
    updatedAt: FieldValue.serverTimestamp(),
  };

  const ref = db.collection("campaigns").doc(CAMPAIGN_ID);
  const existing = await ref.get();
  await ref.set(
    {
      ...campaign,
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );

  console.log(`Seeded LearnX campaign "${CAMPAIGN_ID}" in project ${projectId}.`);
  console.log(`  adText: ${campaign.adText}`);
  console.log(`  budget: $${(campaign.budgetCents / 100).toFixed(2)}`);
  console.log(`  cpm:    $${(campaign.cpmCents / 100).toFixed(2)}`);
  console.log("");
  console.log("Next: set SPINSHARE_USE_FIRESTORE=1 in .env, restart pnpm dev, then:");
  console.log("  curl http://localhost:3000/api/ad");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
