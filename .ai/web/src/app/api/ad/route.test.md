# route.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Tests route-level behavior for `GET /api/ad`.

## Planned Change

Add red coverage that a successful ad selection increments the aggregate show
counter and rewrites clickable destinations to `/api/click`.

## Implemented Change

Added route coverage for show-count increments and tracked click URL rewriting.

## Planned Change 2026-06-15 Cumulative Viewability

Add red route coverage proving an authenticated developer with pending progress
gets that same campaign from `GET /api/ad` before normal highest-bid selection.

## Planned Change 2026-06-15 Auth Boundary

Add red route coverage proving:

- missing bearer token returns `401`, does not return an ad, and does not
  increment `shows`;
- invalid bearer token returns `401`;
- authenticated requests still select ads, rewrite click URLs, and increment
  `shows`.

## Implemented Test 2026-06-15 Auth Boundary

Added missing-token and invalid-token 401 tests. Updated the show/click rewrite
success test to authenticate with a minted mock device token.

## Planned Change 2026-06-15 Served Marker

Extend the authenticated success test to assert that `/api/ad` writes a
0ms progress marker for the developer and selected campaign.

## Implemented Test 2026-06-15 Served Marker

The authenticated show/click rewrite test now also asserts
`container.progress.getByDeveloper("dev_1")` returns the selected campaign with
`accumulatedViewDurationMs: 0`.

## Verification 2026-06-15 Served Marker

- Red: focused ad/track route run failed because the progress marker was null.
- Green: focused ad/track route run passed with 10 tests.
- Full web/root/lint verification passed after implementation.

## Verification 2026-06-15 Auth Boundary

- Red: focused ad route test failed because unauthenticated requests returned
  `200`.
- Green: focused ad route test passed with 4 tests.
- Full web regression passed with 186 tests and 1 skipped emulator integration.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented ad-route served-marker regression coverage. | Codex |
| 2026-06-15 | Planned ad-route served-marker regression coverage. | Codex |
| 2026-06-15 | Implemented ad-route required-auth regression tests. | Codex |
| 2026-06-15 | Planned ad-route required-auth regression tests. | Codex |
| 2026-06-15 | Planned pending-progress ad route test. | Codex |
| 2026-06-15 | Planned ad-route telemetry tests. | Codex |
| 2026-06-15 | Implemented ad-route telemetry tests. | Codex |
