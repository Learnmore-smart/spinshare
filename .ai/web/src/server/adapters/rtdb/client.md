# client.ts (rtdb)

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose（一句话人话）

Lazily provides the shared Firebase Realtime Database handle, reusing the same
Admin app as Firestore so one set of credentials drives both services.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `getRealtimeDb()` | `() => Database` | Shared RTDB instance (cached) |

## Dependencies

- **External:** `firebase-admin/database` — `getDatabase`.
- **Internal:** `../firestore/client` (`getAdminApp`) — reuses the one Admin app
  so `databaseURL` (from `FIREBASE_DATABASE_URL`) is configured once.

## Important Notes / NEVER Change

- The Admin app MUST be initialized with `databaseURL` for RTDB to work; that
  wiring lives in `../firestore/client.ts::getAdminApp` (reads
  `FIREBASE_DATABASE_URL`).

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created — RTDB client helper | Kiro |
