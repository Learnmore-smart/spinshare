/**
 * Firebase Realtime Database (RTDB) client initialization.
 *
 * Provides a single, lazily-initialized RTDB handle backed by the *same*
 * Firebase Admin app as Firestore (see `../firestore/client.ts::getAdminApp`),
 * so one set of service-account credentials drives both Google services. The
 * app is configured with `databaseURL` (from `FIREBASE_DATABASE_URL`) at init.
 *
 * RTDB is the Google-native replacement for the former Redis/Upstash hot path:
 * a generous free tier, already inside the same Firebase project, and designed
 * for ultra-low-latency counting/caching. See design "Provider Abstraction
 * Layer (Ports)" and the RTDB key schema.
 */

import { getDatabase, type Database } from "firebase-admin/database";

import { getAdminApp } from "../firestore/client";

let cachedDb: Database | undefined;

/**
 * Returns the shared RTDB instance, initializing it once. Requires
 * `FIREBASE_DATABASE_URL` to be configured (wired into the Admin app by
 * `getAdminApp`); otherwise the Admin SDK throws a clear "Can't determine
 * Firebase Database URL" error.
 */
export function getRealtimeDb(): Database {
  if (!cachedDb) {
    cachedDb = getDatabase(getAdminApp());
  }
  return cachedDb;
}
