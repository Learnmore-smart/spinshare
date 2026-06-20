#!/usr/bin/env node
/** Deletes only the two explicitly authorized random-UUID user test documents. */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export const LEGACY_USER_IDS = Object.freeze([
  "6217f46f-6a22-4ae8-94db-db9fce2e948d",
  "fa8e2f7e-6365-443b-ad45-10dcf4d24761",
]);

const MODULE_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(MODULE_PATH), "../..");

function parseDotEnv(contents) {
  const parsed = {};
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (!match) continue;
    let value = (match[2] ?? "").trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    parsed[match[1]] = value;
  }
  return parsed;
}

async function loadEnv() {
  const fileEnv = parseDotEnv(
    await readFile(path.join(REPO_ROOT, ".env"), "utf8"),
  );
  return { ...fileEnv, ...process.env };
}

function createFirestore(env) {
  const projectId = (env.FIREBASE_PROJECT_ID ?? "").trim();
  const clientEmail = (env.FIREBASE_CLIENT_EMAIL ?? "").trim();
  const privateKey = (env.FIREBASE_PRIVATE_KEY ?? "").trim();
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY",
    );
  }
  const appName = "spinshare-delete-legacy-users";
  const existing = getApps().find((app) => app.name === appName);
  const app =
    existing ??
    initializeApp(
      {
        projectId,
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      },
      appName,
    );
  return { db: getFirestore(app), projectId };
}

/** Executes the allowlisted cleanup and verifies the target documents afterward. */
export async function deleteLegacyUserDocs(db, { confirm }) {
  const refs = LEGACY_USER_IDS.map((id) => db.collection("users").doc(id));
  const deleted = [];
  if (confirm) {
    for (const ref of refs) {
      await ref.delete();
      deleted.push(ref.id);
    }
  }
  const snapshots = await Promise.all(refs.map((ref) => ref.get()));
  const remaining = refs
    .filter((_, index) => snapshots[index].exists)
    .map((ref) => ref.id);
  return { deleted, remaining };
}

async function main() {
  const confirm = process.argv.includes("--confirm");
  const env = await loadEnv();
  const { db, projectId } = createFirestore(env);
  const result = await deleteLegacyUserDocs(db, { confirm });

  console.log(`Firestore project: ${projectId}`);
  console.log("Allowlisted paths:");
  for (const id of LEGACY_USER_IDS) console.log(`  users/${id}`);
  if (!confirm) {
    console.log("Dry run only. Pass --confirm to delete these exact documents.");
  } else {
    console.log(`Deleted: ${result.deleted.length}`);
  }
  console.log(`Remaining: ${result.remaining.length}`);
  if (confirm && result.remaining.length > 0) {
    throw new Error("Legacy user cleanup verification failed");
  }
}

if (path.resolve(process.argv[1] ?? "") === MODULE_PATH) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
