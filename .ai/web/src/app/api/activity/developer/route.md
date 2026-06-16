# route.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Authenticated developer activity ledger API for impression attempts.

## Planned Behavior

- Validate bearer `Device_Auth_Token`.
- Return `401` when unauthenticated.
- Read attempt-level activity entries for `claims.userId`.
- Return credited and non-credited activity rows with status, duration, money fields, and timestamp.

## Planned Change 2026-06-15 Activity Ledger

Replace credited-ledger-only reads with `activities.listByDeveloper()`, so the
developer can see too-short, invalid-token, invalid-campaign, shadow-banned,
earning-capped, duplicate, and credited outcomes in one activity feed.

## Implemented Change 2026-06-15 Activity Ledger

`GET /api/activity/developer` now reads `activities.listByDeveloper()` and
returns `impression_attempt` rows with status, duration, money fields, and
timestamp.

## Implemented Change 2026-06-15 Pagination

Return bounded newest-first ledger pages instead of an unbounded array. Support
`limit` and `cursor` query parameters and include `nextCursor` when more rows
exist.

## Implemented Change

Added `GET /api/activity/developer`. It authenticates bearer tokens and returns `credited_impression` rows from `ledger.listByDeveloper()`.

## Verification

- Red: route test failed because `./route` did not exist.
- Green: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/activity/developer/route.test.ts` passed.
- Pagination focused run passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/activity/developer/route.test.ts src/app/api/activity/advertiser/route.test.ts`.
- Full regression passed after pagination:
  `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented developer activity pagination. | Codex |
| 2026-06-15 | Planned developer activity pagination. | Codex |
| 2026-06-15 | Implemented attempt-level developer activity API. | Codex |
| 2026-06-15 | Planned migration from credited ledger rows to attempt-level activity rows. | Codex |
| 2026-06-15 | Implemented credited developer activity API. | Codex |
| 2026-06-15 | Created doc before adding developer activity route. | Codex |
