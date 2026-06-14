# client.ts (firestore)

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose（一句话人话）

Lazily initializes the shared Firebase Admin app and Firestore handle. The same
app is now also reused for Realtime Database (RTDB).

## Public API

| Name | Type | Description |
|------|------|-------------|
| `getFirestoreClient()` | `() => Firestore` | Shared Firestore instance |
| `getAdminApp()` | `() => App` | Shared Admin app (used by Firestore + RTDB) |
| `isUsingEmulator()` | `() => boolean` | True when pointed at the local emulator |

## Notes

- `getAdminApp` initializes the app with `databaseURL` from
  `FIREBASE_DATABASE_URL` when present, so `getDatabase(app)` (RTDB) works
  without a second app/credential set. Emulator/ADC otherwise.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Export `getAdminApp`; add `databaseURL` for RTDB reuse | Kiro |
