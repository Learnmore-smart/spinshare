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

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
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
    process.env.FIREBASE_PROJECT_ID ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.GCLOUD_PROJECT ??
    "spinshare-local"
  );
}

/**
 * Builds an explicit service-account credential from `FIREBASE_CLIENT_EMAIL` +
 * `FIREBASE_PRIVATE_KEY` (e.g. injected from Google Secret Manager). Returns
 * `undefined` when they are absent so local/emulator runs fall back to
 * Application Default Credentials and need no service account.
 *
 * The private key is stored with escaped `\n` sequences in `.env` / secret
 * managers; we restore the real newlines the Admin SDK expects.
 */
function resolveCredential() {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (
    clientEmail &&
    clientEmail.length > 0 &&
    privateKey &&
    privateKey.length > 0
  ) {
    return cert({
      projectId: resolveProjectId(),
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    });
  }
  return undefined;
}

/**
 * Returns the shared SpinShare Admin app, initializing it once.
 *
 * Exported so other Google services (e.g. the Realtime Database hot-path
 * counter store) reuse the exact same app + credentials rather than spinning up
 * a second Admin instance. When `FIREBASE_DATABASE_URL` is present it is wired
 * into the app config so `getDatabase(app)` (RTDB) resolves without any extra
 * credential setup.
 */
export function getAdminApp(): App {
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) {
    return existing;
  }
  const projectId = resolveProjectId();
  const credential = resolveCredential();
  const databaseURL = process.env.FIREBASE_DATABASE_URL?.trim() || undefined;
  // Explicit service-account credential in production (FIREBASE_* secrets);
  // ADC/emulator otherwise. `databaseURL` is added only when configured.
  return initializeApp(
    {
      projectId,
      ...(credential ? { credential } : {}),
      ...(databaseURL ? { databaseURL } : {}),
    },
    APP_NAME,
  );
}

let cachedDb: Firestore | undefined;

/**
 * Returns the shared Firestore instance. When `FIRESTORE_EMULATOR_HOST` is set
 * (e.g. `127.0.0.1:8080`) the Admin SDK transparently targets the emulator.
 */
export function getFirestoreClient(): Firestore {
  if (!cachedDb) {
    cachedDb = getFirestore(getAdminApp());
  }
  return cachedDb;
}

/** Whether the Firestore client is currently pointed at the local emulator. */
export function isUsingEmulator(): boolean {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}
