# route.test.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Tests for the public advertiser checkout endpoint.

## What It Does

- Verifies valid form payloads create zero-budget campaigns and return checkout URLs.
- Verifies the public leaderboard toggle is persisted.
- Verifies invalid payloads return 400 and do not create checkout sessions.

## Public API

| Name | Type | Description |
|------|------|-------------|
| Public checkout route tests | Vitest tests | Regression coverage for `POST /api/advertiser-checkout`. |

## Dependencies

- External: `vitest`.
- Internal: route handler and memory adapters through the app container.

## Important Notes / NEVER Change

- Tests must run credential-free against local mock adapters.
- Keep assertions focused on observable route behavior and repository state.

## Planned Fix (2026-06-15)

Add a red regression proving mock checkout immediately funds the created campaign so `/api/market` can show it after reload in local development. Keep the test explicit that this is mock-only behavior.

## Implemented Change 2026-06-15 Advertiser Money Events

The settled mock checkout test now verifies two advertiser activity events are
written: `checkoutStarted` and `budgetFunded`, both tied to the created
campaign and checkout session id.

## Planned Change

Add failing tests before implementing the route.

## Implemented Test

Added tests for successful checkout creation with private leaderboard metadata and invalid HTTPS URL rejection.

## Verification

- Initial focused web run failed because `./route` was missing.
- Final `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/advertiser-checkout/route.test.ts src/app/api/market/route.test.ts src/app/page.test.tsx` passed: 3 files, 5 tests.

## Planned Coverage 2026-06-20 Delivery Inventory

Assert public checkout passes the exact purchased impression count and settled
mock checkout persists that count on the created campaign.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Planned public checkout purchased-inventory coverage. | Codex |
| 2026-06-15 | Added public checkout money activity event coverage. | Codex |
| 2026-06-15 | Documented mock-settlement regression test plan. | Codex |
| 2026-06-13 | Created doc before adding public checkout route tests. | Codex |
| 2026-06-13 | Synced doc with final public checkout route tests. | Codex |
