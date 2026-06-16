# route.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

HTTP adapter for `POST /api/track` impression tracking.

## What It Does

- Parses request JSON.
- Validates the body with `trackRequestSchema`.
- Extracts the bearer token.
- Delegates authorized, valid impressions to `recordImpression`.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `POST` | Route handler | Tracks one eligible impression. |

## Dependencies

- Internal: `@/server/container`, `@/server/ledger-service`.
- External: `@spinshare/core` schema.

## Important Notes / NEVER Change

- Malformed or invalid request bodies must return `400` without mutation.
- Missing or invalid tokens must return `401`.
- Invalid or unfunded campaigns must return `422`.

## Planned Change

Backend validation will require the shared `viewDurationMs >= 3000` tracking
contract. The route should keep delegating only after schema validation passes.

## Planned Change (2026-06-15)

Record aggregate campaign telemetry for track outcomes: below-minimum view
duration, invalid token, invalid/out-of-budget campaign, credited impression,
shadow-ban suppression, earning-cap suppression, and duplicate suppression.
Do not expose suppression details to the public response body.

## Implemented Change (2026-06-15)

The route now increments aggregate campaign telemetry for invalid viewability
requests, auth failures, invalid/out-of-budget campaigns, credited impressions,
shadow-ban suppression, earning-cap suppression, and duplicate suppression.

## Planned Change (2026-06-15 Activity Ledger)

In addition to aggregate telemetry, write one attempt-level activity record for
track outcomes where a campaign id is present: too-short, invalid token, invalid
campaign, credited, shadow-banned, earning-capped, and duplicate.

## Implemented Change (2026-06-15 Activity Ledger)

`POST /api/track` now writes best-effort attempt-level activity records for
too-short, credited, invalid token, invalid campaign, shadow-banned,
earning-capped, and duplicate outcomes. The route keeps the existing public
response contract and the existing `recordImpression` dependency shape.

## Planned Change 2026-06-15 Cumulative Viewability

Replace the current "below 3 seconds returns 400" behavior with cumulative
progress:

- accept positive short `viewDurationMs` segments
- validate token and campaign before storing progress
- add the segment to the developer's pending campaign progress
- return `recorded: false` while cumulative duration remains below 3000 ms
- when cumulative duration reaches 3000 ms, call `recordImpression`, record the
  settled activity, clear progress, and return the existing settled response
- keep malformed body, missing token, invalid token, and invalid campaign status
  behavior intact

## Implemented Change 2026-06-15 Cumulative Viewability

The route now accepts positive short `viewDurationMs` segments after schema
validation, validates token and campaign, and stores cumulative progress through
`ImpressionProgressRepository`. While cumulative view time is below
`VIEWABILITY_MIN_MS`, it returns `recorded:false` and does not call
`recordImpression`. Once cumulative duration reaches the threshold, it calls
`recordImpression`, records the settled activity with the accumulated duration,
clears the developer's pending progress, and returns the settled response.

## Implemented Change 2026-06-15 Advertiser Money Events

When a settled impression is actually credited, the route now records a
best-effort `budgetDebited` advertiser activity event in addition to the
existing impression attempt row. Suppressed outcomes (`shadowBanned`,
`earningCapped`, `duplicate`) do not write budget debit events.

## Planned Change 2026-06-15 Served Marker Validation

Before accepting a positive `viewDurationMs`, require a pending progress marker
for the authenticated developer whose `campaignId` matches the request. Missing
or mismatched markers return the existing invalid/insufficient campaign `422`
without adding progress and without calling `recordImpression`.

Root cause: token + valid campaign is not enough proof of a displayed ad.
Without a server-side served marker, an authenticated developer can POST any
funded `campaignId` and drain budget without first receiving that ad from
`GET /api/ad`.

## Implemented Change 2026-06-15 Served Marker Validation

After token and campaign validation, the route now reads
`progress.getByDeveloper(claims.userId)` before adding duration. Missing or
mismatched markers return `422 { error: "invalid_or_insufficient_campaign" }`,
record `invalidCampaign` activity/telemetry, and do not call
`progress.addDuration` or `recordImpression`.

## Verification 2026-06-15 Served Marker Validation

- Red: focused ad/track route tests failed because unserved tracking continued
  to `addDuration`.
- Green: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/ad/route.test.ts src/app/api/track/route.test.ts` passed with 10 tests.
- Full web regression passed: `corepack pnpm@9.12.0 --filter @spinshare/web test`.
- Full root regression and lint/typecheck passed: `corepack pnpm@9.12.0 test`
  and `corepack pnpm@9.12.0 lint`.

## Verification (2026-06-15 Cumulative Viewability)

- Focused web cumulative viewability run passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/memory/memory-impression-progress-repository.test.ts src/server/bidding-service.test.ts src/app/api/ad/route.test.ts src/app/api/track/route.test.ts`
  (4 files, 17 tests).

## Previous Verification (2026-06-15)

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Superseded Implemented Change

Earlier 3-second viewability work made the route reject below-threshold
durations before ledger mutation. That behavior has been superseded by the
cumulative progress model above.

## Verification

- Red: focused track route coverage failed while a 2999 ms request was still accepted.
- Green: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/track/route.test.ts src/app/page.test.tsx src/app/dashboard/advertiser/advertiser-dashboard.test.tsx` passed.
- Full workspace tests and lint passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented served-marker validation before track settlement. | Codex |
| 2026-06-15 | Planned served-marker validation before track settlement. | Codex |
| 2026-06-15 | Added advertiser budget debit activity events for credited impressions. | Codex |
| 2026-06-15 | Implemented cumulative viewability progress handling. | Codex |
| 2026-06-15 | Planned cumulative viewability progress handling. | Codex |
| 2026-06-15 | Implemented attempt-level activity records for track outcomes. | Codex |
| 2026-06-15 | Planned attempt-level activity records for track outcomes. | Codex |
| 2026-06-13 | Created doc before adding track route viewability contract coverage. | Codex |
| 2026-06-13 | Synced docs with track route 3-second validation contract. | Codex |
