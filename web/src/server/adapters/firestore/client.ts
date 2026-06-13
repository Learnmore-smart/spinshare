/**
 * Firestore client initialization.
 *
 * Provides a single, lazily-initialized Firestore instance backed by the
 * Firebase Admin SDK. The Admin SDK automatically routes all reads/writes to a
 * local emulator when `FIRESTORE_EMULATOR_HOST` is set in the environment, so
 * the very same client and adapter code drive both local (emulator) and
 * production Firestore — selection is configuration-only.
 *
 * See design "Data Models", "Configuration switch", and the Firestore row of
 * the dependency table (`@google-cloud/firestore` in prod, emulator locally via
 * `FIRESTORE_EMULATOR_HOST`).
 */

import { getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/** App name used so we never collide with other Admin SDK consumers. */
const APP_NAME = "spinshare-web";

/**
 * Resolves the GCP project id. The emulator does not require a real project,
 * but the Admin SDK still needs one to namespace data, so we fall back to a
 * deterministic local id.
 */
function resolveProjectId(): string {
  return (
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.GCLOUD_PROJECT ??
    process.env.FIREBASE_PROJECT_ID ??
    "spinshare-local"
  );
}

/** Returns the shared SpinShare Admin app, initializing it once. */
function getOrInitApp(): App {
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) {
    return existing;
  }
  return initializeApp({ projectId: resolveProjectId() }, APP_NAME);
}

let cachedDb: Firestore | undefined;

/**
 * Returns the shared Firestore instance. When `FIRESTORE_EMULATOR_HOST` is set
 * (e.g. `127.0.0.1:8080`) the Admin SDK transparently targets the emulator.
 */
export function getFirestoreClient(): Firestore {
  if (!cachedDb) {
    cachedDb = getFirestore(getOrInitApp());
  }
  return cachedDb;
}

/** Whether the Firestore client is currently pointed at the local emulator. */
export function isUsingEmulator(): boolean {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}
