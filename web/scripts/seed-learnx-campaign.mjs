#!/usr/bin/env node
/**
 * Upserts a funded LearnX demo campaign into Firestore for local extension testing.
 *
 * Run from repo root:
 *   node web/scripts/seed-learnx-campaign.mjs
 *
 * Requires FIREBASE_* service-account creds in repo-root `.env`.
 * Set SPINSHARE_USE_FIRESTORE=1 in `.env` and restart `pnpm dev` so the web app
 * reads this campaign via GET /api/ad. When localhost uses cloud Firestore, also
 * set SPINSHARE_FIRESTORE_NAMESPACE=test so this seed writes into the same test
 * namespace the app reads.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const MODULE_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(MODULE_PATH);
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
const ENV_FILE = path.join(REPO_ROOT, ".env");

export const LEARNX_CAMPAIGN_ID = "cmp-learnx-demo";
export const LEARNX_AD_TEXT = "LearnX - Know exactly what to study";
export const LEARNX_CAMPAIGN_DESTINATION_URL = "https://www.learnx.pro";

const ADVERTISER_ID = "seed-learnx-advertiser";
const FIRESTORE_NAMESPACE_PATTERN = /^[A-Za-z0-9._-]+$/;

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

export function campaignCollectionPath(env = process.env) {
  const namespace = (env.SPINSHARE_FIRESTORE_NAMESPACE ?? "").trim();
  if (namespace.length === 0) {
    return "campaigns";
  }
  if (!FIRESTORE_NAMESPACE_PATTERN.test(namespace)) {
    throw new Error(
      "Invalid SPINSHARE_FIRESTORE_NAMESPACE. Use only letters, numbers, dot, underscore, or hyphen.",
    );
  }
  return `namespaces/${namespace}/campaigns`;
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
    id: LEARNX_CAMPAIGN_ID,
    advertiserId: ADVERTISER_ID,
    adText: LEARNX_AD_TEXT,
    brandName: "LearnX",
    destinationUrl: LEARNX_CAMPAIGN_DESTINATION_URL,
    publicOnLeaderboard: true,
    cpmCents: 3_000,
    budgetCents: 5_000,
    status: "active",
    createdAtMs: nowMs,
    updatedAt: FieldValue.serverTimestamp(),
  };

  const collection = campaignCollectionPath(env);
  const ref = db.collection(collection).doc(LEARNX_CAMPAIGN_ID);
  const existing = await ref.get();
  await ref.set(
    {
      ...campaign,
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );

  console.log(
    `Seeded LearnX campaign "${LEARNX_CAMPAIGN_ID}" in project ${projectId}.`,
  );
  console.log(`  collection: ${collection}`);
  console.log(`  adText: ${campaign.adText}`);
  console.log(`  destination: ${campaign.destinationUrl}`);
  console.log(`  budget: $${(campaign.budgetCents / 100).toFixed(2)}`);
  console.log(`  cpm:    $${(campaign.cpmCents / 100).toFixed(2)}`);
  console.log("");
  console.log(
    "Next: set SPINSHARE_USE_FIRESTORE=1 and SPINSHARE_FIRESTORE_NAMESPACE=test in .env, restart pnpm dev, then:",
  );
  console.log("  curl http://localhost:3000/api/ad");
}

if (path.resolve(process.argv[1] ?? "") === MODULE_PATH) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
