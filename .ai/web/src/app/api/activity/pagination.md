# pagination.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Shared route-level pagination helpers for activity ledger APIs.

## Implemented Change 2026-06-15 Activity Ledger Pagination

Developer and advertiser activity APIs should return newest-first bounded
pages, not unbounded activity arrays. Add a small route helper for:

- parsing `limit` with a safe default and max;
- sorting by `createdAtMs` descending with `activityId` as a stable tie-breaker;
- applying an opaque cursor;
- returning `{ items, nextCursor }`.

This is route-level first because current repositories expose full-list methods.
If Firestore volume grows, the same API contract can be pushed down into the
repository layer later.

## Verification

- Red focused route tests failed before pagination because the routes returned
  unbounded insertion-order arrays and no `nextCursor`.
- Green focused run passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/activity/developer/route.test.ts src/app/api/activity/advertiser/route.test.ts`.
- Full regression passed after the pagination update:
  `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented route-level activity pagination helper. | Codex |
| 2026-06-15 | Planned route-level activity pagination helper. | Codex |
