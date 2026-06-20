#!/usr/bin/env node
/**
 * Deletes all documents from every root Firestore collection in the configured
 * Firebase project (recursive delete, including subcollections).
 *
 * Run from repo root:
 *   node web/scripts/clear-firestore.mjs
 *
 * Requires FIREBASE_* service-account creds in repo-root `.env`.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const MODULE_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(MODULE_PATH);
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

function getApp(projectId, credential) {
  const appName = "spinshare-clear-firestore";
  const existing = getApps().find((app) => app.name === appName);
  if (existing) return existing;
  return initializeApp({ projectId, credential }, appName);
}

async function main() {
  const env = await loadEnv();
  const { projectId, credential } = resolveCredential(env);
  const app = getApp(projectId, credential);
  const db = getFirestore(app);

  const collections = await db.listCollections();
  if (collections.length === 0) {
    console.log(`Firestore project ${projectId} has no root collections.`);
    return;
  }

  console.log(
    `Deleting all documents in ${collections.length} root collection(s) on project ${projectId}:`,
  );
  for (const collection of collections) {
    console.log(`  - ${collection.id}`);
    await db.recursiveDelete(collection);
    console.log(`    done`);
  }

  const remaining = await db.listCollections();
  console.log(
    remaining.length === 0
      ? "All Firestore data deleted."
      : `Warning: ${remaining.length} root collection(s) still remain.`,
  );
}

if (path.resolve(process.argv[1] ?? "") === MODULE_PATH) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
