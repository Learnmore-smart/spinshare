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

## Verification (2026-06-15)

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Implemented Change

The route continues to delegate only after `trackRequestSchema` validation, and
that shared schema now requires `viewDurationMs` to be an integer at least 3000.
Below-threshold requests return `400` before ledger mutation.

## Verification

- Red: focused track route coverage failed while a 2999 ms request was still accepted.
- Green: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/track/route.test.ts src/app/page.test.tsx src/app/dashboard/advertiser/advertiser-dashboard.test.tsx` passed.
- Full workspace tests and lint passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created doc before adding track route viewability contract coverage. | Codex |
| 2026-06-13 | Synced docs with track route 3-second validation contract. | Codex |
