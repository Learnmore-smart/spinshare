# page.tsx — Developer dashboard route

> Protection: STANDARD

## Purpose

Server component at `/dashboard/developer`. Authenticates via NextAuth, loads the developer's ledger from `LedgerRepository.listByDeveloper`, summarizes with `summarizeLedger`, renders `DeveloperDashboardView`. On failure renders `DeveloperDashboardError` (never crashes).

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-14 | "Couldn't load your dashboard" after adding Firebase secrets to `.env` | (1) First page load ran before `FIREBASE_*` creds were in env → Admin SDK fell back to ADC, hung ~40s, threw. (2) Next.js hot-reload kept a credential-less cached `getAdminApp()` singleton even after creds were added — **restart `pnpm dev`**. (3) Changing `AUTH_SECRET` on reload invalidated the session cookie — **sign in again**. (4) `catch` swallowed the real error. | Fail fast in `buildContainer` when production Firestore is required but creds are missing; log + surface the error message in development. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Dev error surfacing + documented stale-credential hot-reload bug | Cursor |
