#!/usr/bin/env node
/**
 * Removes the LearnX demo campaign from production Firestore (top-level collections).
 *
 * Run from repo root:
 *   node web/scripts/delete-prod-learnx-campaign.mjs
 *
 * Do NOT set SPINSHARE_FIRESTORE_NAMESPACE — production campaigns live at `campaigns/`.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";

import { LEARNX_CAMPAIGN_ID } from "./seed-learnx-campaign.mjs";

const MODULE_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(MODULE_PATH);
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
const ENV_FILE = path.join(REPO_ROOT, ".env");
const CAMPAIGNS_COLLECTION = "campaigns";
const RTDB_BUDGET_ROOT = "spinshare/hot/bud";

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
    databaseURL: (env.FIREBASE_DATABASE_URL ?? "").trim() || undefined,
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  };
}

function getApp(projectId, credential, databaseURL) {
  const appName = "spinshare-delete-learnx";
  const existing = getApps().find((app) => app.name === appName);
  if (existing) return existing;
  return initializeApp(
    {
      projectId,
      credential,
      ...(databaseURL ? { databaseURL } : {}),
    },
    appName,
  );
}

function isLearnxCampaign(data) {
  const brand = String(data.brandName ?? "");
  const adText = String(data.adText ?? "");
  return brand.includes("LearnX") || adText.includes("LearnX");
}

async function main() {
  const forceProduction = process.argv.includes("--production");
  const env = await loadEnv();
  const namespace = forceProduction
    ? ""
    : (env.SPINSHARE_FIRESTORE_NAMESPACE ?? "").trim();
  if (!forceProduction && namespace.length > 0) {
    throw new Error(
      `SPINSHARE_FIRESTORE_NAMESPACE=${namespace} is set. Unset it or pass --production to delete top-level production campaigns.`,
    );
  }

  const { projectId, credential, databaseURL } = resolveCredential(env);
  const app = getApp(projectId, credential, databaseURL);
  const db = getFirestore(app);

  const targets = new Set([LEARNX_CAMPAIGN_ID]);
  const snapshot = await db.collection(CAMPAIGNS_COLLECTION).get();
  for (const doc of snapshot.docs) {
    if (isLearnxCampaign(doc.data())) {
      targets.add(doc.id);
    }
  }

  if (targets.size === 0) {
    console.log("No LearnX campaigns found in production Firestore.");
    return;
  }

  const batch = db.batch();
  for (const campaignId of targets) {
    batch.delete(db.collection(CAMPAIGNS_COLLECTION).doc(campaignId));
  }
  await batch.commit();

  console.log(
    `Deleted ${targets.size} LearnX campaign(s) from ${CAMPAIGNS_COLLECTION} in project ${projectId}:`,
  );
  for (const campaignId of targets) {
    console.log(`  - ${campaignId}`);
  }

  if (!databaseURL) {
    console.log("Skipped RTDB cleanup: FIREBASE_DATABASE_URL not set.");
    return;
  }

  const rtdb = getDatabase(app);
  for (const campaignId of targets) {
    const ref = rtdb.ref(`${RTDB_BUDGET_ROOT}/${campaignId}`);
    const existing = await ref.get();
    if (existing.exists()) {
      await ref.remove();
      console.log(`  cleared RTDB ${RTDB_BUDGET_ROOT}/${campaignId}`);
    }
  }
}

if (path.resolve(process.argv[1] ?? "") === MODULE_PATH) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
