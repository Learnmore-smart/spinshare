#!/usr/bin/env node
/**
 * Upserts the initial 6-campaign ad market into PRODUCTION Firestore.
 *
 * Money model (see .ai/web/scripts/seed-ad-market.md):
 *   1 Block      = 1000 impressions
 *   cpmCents     = Price per Block * 100
 *   budgetCents  = cpmCents * Blocks bought
 *
 * Each campaign uses a deterministic `cmp-seed-*` doc id, so re-running this
 * script updates the existing docs in place (idempotent upsert) instead of
 * creating duplicates.
 *
 * Run from repo root:
 *   node web/scripts/seed-ad-market.mjs --dry-run               # preview, no writes
 *   node web/scripts/seed-ad-market.mjs --production            # write to prod campaigns/
 *   node web/scripts/seed-ad-market.mjs --production --delete   # remove the seeded campaigns
 *
 * Requires FIREBASE_* service-account creds in repo-root `.env`.
 *
 * Production campaigns live at top-level `campaigns/`. Because repo `.env` keeps
 * SPINSHARE_FIRESTORE_NAMESPACE="test" for localhost cloud-Firestore testing,
 * the script refuses to run while a namespace is set unless `--production` is
 * passed — mirroring delete-prod-learnx-campaign.mjs.
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
const FIRESTORE_NAMESPACE_PATTERN = /^[A-Za-z0-9._-]+$/;

/**
 * The seed market. `blocks` is the number of 1000-impression Blocks bought;
 * `budgetCents` is the advertiser's stated total and is cross-checked against
 * `cpmCents * blocks` by {@link validateCampaigns} before anything is written.
 */
export const SEED_CAMPAIGNS = [
  {
    id: "cmp-seed-cursor",
    advertiserId: "seed-cursor-advertiser",
    brandName: "Cursor",
    adText: "Cursor — The best way to code with AI",
    destinationUrl: "https://cursor.com/",
    cpmCents: 1120,
    blocks: 5,
    budgetCents: 5600,
  },
  {
    id: "cmp-seed-learnx",
    advertiserId: "seed-learnx-advertiser",
    brandName: "LearnX",
    adText: "LearnX — Know exactly what to study",
    destinationUrl: "https://learnx.pro/",
    cpmCents: 560,
    blocks: 10,
    budgetCents: 5600,
  },
  {
    id: "cmp-seed-trae",
    advertiserId: "seed-trae-advertiser",
    brandName: "Trae",
    adText: "Trae — The Real AI Engineer",
    destinationUrl: "https://www.trae.ai/",
    cpmCents: 1000,
    blocks: 4,
    budgetCents: 4000,
  },
  {
    id: "cmp-seed-antigravity",
    advertiserId: "seed-antigravity-advertiser",
    brandName: "Antigravity",
    adText: "Antigravity — Experience Liftoff",
    destinationUrl: "https://antigravity.google/",
    cpmCents: 850,
    blocks: 5,
    budgetCents: 4250,
  },
  {
    id: "cmp-seed-glm",
    advertiserId: "seed-glm-advertiser",
    brandName: "GLM",
    adText: "GLM — Built for Long-Horizon Tasks",
    destinationUrl: "https://z.ai/",
    cpmCents: 880,
    blocks: 6,
    budgetCents: 5280,
  },
  {
    id: "cmp-seed-spinshare",
    advertiserId: "seed-spinshare-advertiser",
    brandName: "SpinShare",
    adText: "SpinShare — Get paid when your AI thinks",
    destinationUrl: "https://spinshare.dev/",
    cpmCents: 600,
    blocks: 10,
    budgetCents: 6000,
  },
];

/**
 * Validates every campaign against the money model and core schema bounds.
 * Throws on the first violation so a typo fails fast before any write.
 */
export function validateCampaigns(campaigns = SEED_CAMPAIGNS) {
  const seenIds = new Set();
  for (const c of campaigns) {
    if (seenIds.has(c.id)) {
      throw new Error(`Duplicate campaign id: ${c.id}`);
    }
    seenIds.add(c.id);

    const expectedBudget = c.cpmCents * c.blocks;
    if (c.budgetCents !== expectedBudget) {
      throw new Error(
        `${c.id}: budgetCents ${c.budgetCents} != cpmCents ${c.cpmCents} * blocks ${c.blocks} (${expectedBudget})`,
      );
    }
    if (!Number.isInteger(c.cpmCents) || c.cpmCents < 100 || c.cpmCents > 100_000) {
      throw new Error(`${c.id}: cpmCents ${c.cpmCents} out of range 100..100000`);
    }
    if (c.adText.length < 1 || c.adText.length > 60) {
      throw new Error(`${c.id}: adText length ${c.adText.length} out of range 1..60`);
    }
    if (!/^https:\/\//.test(c.destinationUrl)) {
      throw new Error(`${c.id}: destinationUrl must be https — got ${c.destinationUrl}`);
    }
  }
  return campaigns;
}

/** Builds the Firestore document body for a seed campaign (sans timestamps). */
export function toCampaignDoc(c, nowMs) {
  return {
    id: c.id,
    advertiserId: c.advertiserId,
    adText: c.adText,
    brandName: c.brandName,
    destinationUrl: c.destinationUrl,
    publicOnLeaderboard: true,
    reviewStatus: "approved",
    cpmCents: c.cpmCents,
    budgetCents: c.budgetCents,
    status: "active",
    createdAtMs: nowMs,
  };
}

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

/**
 * Resolves the campaign collection path. With `--production` the namespace is
 * forced empty (top-level `campaigns/`); otherwise a set namespace is honored so
 * an accidental run against the local `test` namespace is rejected by the caller.
 */
export function resolveCampaignCollection(env, { forceProduction } = {}) {
  const namespace = forceProduction ? "" : (env.SPINSHARE_FIRESTORE_NAMESPACE ?? "").trim();
  if (!forceProduction && namespace.length > 0) {
    throw new Error(
      `SPINSHARE_FIRESTORE_NAMESPACE=${namespace} is set. Pass --production to seed top-level production campaigns/, or unset it.`,
    );
  }
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
  const appName = "spinshare-seed-ad-market";
  const existing = getApps().find((app) => app.name === appName);
  const app = existing ?? initializeApp({ projectId, credential }, appName);
  return getFirestore(app);
}

async function main() {
  const forceProduction = process.argv.includes("--production");
  const dryRun = process.argv.includes("--dry-run");
  const del = process.argv.includes("--delete");

  validateCampaigns();

  const env = await loadEnv();
  // A dry run performs no writes, so it previews the production target without
  // tripping the namespace guard. The real write still requires --production.
  const collection = resolveCampaignCollection(env, {
    forceProduction: forceProduction || dryRun,
  });
  const nowMs = Date.now();
  const verb = del ? "delete" : "upsert";

  if (dryRun) {
    console.log(`DRY RUN — would ${verb} ${SEED_CAMPAIGNS.length} campaign(s) in "${collection}":`);
    for (const c of SEED_CAMPAIGNS) {
      console.log(
        `  - ${c.id.padEnd(22)} ${c.brandName.padEnd(12)} cpm $${(c.cpmCents / 100).toFixed(2)} x ${c.blocks} blocks = $${(c.budgetCents / 100).toFixed(2)}`,
      );
    }
    console.log(`\nNo writes performed. Re-run with --production${del ? " --delete" : ""} to apply.`);
    return;
  }

  const { projectId, credential } = resolveCredential(env);
  const db = getDb(projectId, credential);

  if (del) {
    let removed = 0;
    for (const c of SEED_CAMPAIGNS) {
      const ref = db.collection(collection).doc(c.id);
      const existing = await ref.get();
      if (existing.exists) {
        await ref.delete();
        removed += 1;
        console.log(`  deleted ${c.id} (${c.brandName})`);
      } else {
        console.log(`  skipped ${c.id} — not found`);
      }
    }
    console.log(
      `\nRemoved ${removed} seed campaign(s) from "${collection}" on project ${projectId}.`,
    );
    return;
  }

  let written = 0;
  for (const c of SEED_CAMPAIGNS) {
    const ref = db.collection(collection).doc(c.id);
    const existing = await ref.get();
    await ref.set(
      {
        ...toCampaignDoc(c, nowMs),
        updatedAt: FieldValue.serverTimestamp(),
        ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true },
    );
    written += 1;
    console.log(
      `  ${existing.exists ? "updated" : "created"} ${c.id} (${c.brandName}) — $${(c.budgetCents / 100).toFixed(2)} budget @ $${(c.cpmCents / 100).toFixed(2)} CPM`,
    );
  }

  console.log(
    `\nSeeded ${written} campaign(s) into "${collection}" on project ${projectId}.`,
  );
}

if (path.resolve(process.argv[1] ?? "") === MODULE_PATH) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
