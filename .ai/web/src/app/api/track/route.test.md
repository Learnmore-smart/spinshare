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

## Verification

- Red: the below-threshold test failed before the shared schema required duration.
- Green: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/track/route.test.ts src/app/page.test.tsx src/app/dashboard/advertiser/advertiser-dashboard.test.tsx` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created doc before adding track route viewability tests. | Codex |
| 2026-06-13 | Synced docs with track route viewability tests. | Codex |
