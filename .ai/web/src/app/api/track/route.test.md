# route.test.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Focused route tests for `POST /api/track`.

## What It Does

- Verifies invalid request bodies are rejected at the HTTP boundary.
- Verifies the 3-second minimum viewability contract before ledger mutation.

## Public API

| Name | Type | Description |
|------|------|-------------|
| Track route tests | Vitest suite | HTTP boundary coverage. |

## Dependencies

- External: `vitest`.
- Internal: route handler and mocked server container/ledger service.

## Important Notes / NEVER Change

- Tests should prove invalid view durations do not reach ledger logic.

## Planned Change

Create failing tests for below-minimum `viewDurationMs` and accepted
threshold-duration requests.

## Implemented Change

The route tests mock the container and ledger service to assert:

- `viewDurationMs: 2999` returns `400` without calling `recordImpression`.
- `viewDurationMs: 3000` reaches `recordImpression` and returns success.

## Implemented Change (2026-06-15)

Added telemetry bucket coverage for below-minimum view duration, credited
impressions, and invalid-token failures.

## Planned Change (2026-06-15 Activity Ledger)

Extend route tests so each track outcome records one attempt-level activity:
too-short, credited, invalid token, and invalid/out-of-budget campaign. The
route should keep the existing public response contract and ledger-service call
shape while writing best-effort activity records through the container.

## Implemented Change (2026-06-15 Activity Ledger)

Added activity assertions for too-short, credited, invalid-token, and
invalid-campaign track outcomes.

## Implemented Change 2026-06-15 Advertiser Money Events

Credited cumulative settlement coverage now asserts a second advertiser event
row with `status: "budgetDebited"` and the charged revenue in micro-cents.

## Planned Change 2026-06-15 Served Marker Validation

Add red coverage proving `POST /api/track` rejects a valid-token, funded-campaign
request when the developer has no matching pending served marker. Existing
happy-path tests will seed the matching marker through the progress mock.

## Implemented Test 2026-06-15 Served Marker Validation

Added progress mock coverage and a no-marker rejection case. Happy paths now
seed matching progress markers before calling `addDuration`.

## Verification 2026-06-15 Served Marker Validation

- Red: focused ad/track route run failed because unserved tracking continued
  and crashed on the unset `addDuration` response.
- Green: focused ad/track route run passed with 10 tests.
- Full web/root/lint verification passed after implementation.
 
## Verification

- Red: the below-threshold test failed before the shared schema required duration.
- Green: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/track/route.test.ts src/app/page.test.tsx src/app/dashboard/advertiser/advertiser-dashboard.test.tsx` passed.
- Current: `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- Current: `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented served-marker validation tests. | Codex |
| 2026-06-15 | Planned served-marker validation tests. | Codex |
| 2026-06-15 | Added budget debit activity event coverage. | Codex |
| 2026-06-13 | Created doc before adding track route viewability tests. | Codex |
| 2026-06-13 | Synced docs with track route viewability tests. | Codex |
| 2026-06-15 | Added track telemetry bucket tests. | Codex |
| 2026-06-15 | Planned attempt-level activity tests for track outcomes. | Codex |
| 2026-06-15 | Implemented attempt-level activity route tests. | Codex |
## Planned Change 2026-06-15 Cumulative Viewability

Replace old red coverage for "2999 ms returns 400" with cumulative-progress
coverage:

- first short segment records progress and returns `recorded: false`
- second segment for the same developer/campaign reaches 3000 ms and delegates
  to `recordImpression`
- invalid token/campaign paths still do not store progress
