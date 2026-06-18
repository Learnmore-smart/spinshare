# route.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Tests the tracked click redirect endpoint.

## Planned Change

Add red coverage that the endpoint increments click telemetry only after
resolving a campaign with an HTTPS destination and redirects to that destination.

## Implemented Change

Added coverage for click increments, HTTPS destination redirects, and no-count
fallback for campaigns without destinations.

## Planned Change 2026-06-15 Destination Safety Reuse

Add red coverage proving unsafe historical campaign destinations do not
redirect or increment click telemetry, even when they are syntactically valid
HTTPS URLs.

## Implemented Change 2026-06-15 Destination Safety Reuse

Added regression coverage for a stored `https://localhost/` destination. The
test fails until the click endpoint falls back to root and leaves click
telemetry unchanged.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Planned Change 2026-06-16 Click Token Freshness

The signed click-token regression test used a fixed 2023 issue timestamp, so on
2026-06-16 the token is already expired and the "valid token" assertion exercises
the invalid-token branch. Update the test fixture to mint a fresh token at test
runtime while keeping the same campaign-binding assertions.

## Implemented Change 2026-06-16 Click Token Freshness

Updated the valid signed-token fixture to use `Date.now()` at test runtime. The
regression now verifies the valid-token counting path rather than an expired
token branch.

## Verification 2026-06-16

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/track/route.test.ts src/app/api/ad/route.test.ts src/app/api/click/route.test.ts src/app/api/advertiser-checkout/route.test.ts src/app/api/market/route.test.ts src/app/api/campaigns/route.test.ts src/app/api/checkout-status/route.test.ts src/app/api/payouts/status/route.test.ts src/app/api/payouts/withdraw/route.test.ts src/app/api/payouts/connect/route.test.ts` passed with 42 tests.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented and verified fresh signed click-token fixture. | Codex |
| 2026-06-16 | Planned fresh signed click-token fixture for route tests. | Codex |
| 2026-06-15 | Implemented unsafe historical destination click test. | Codex |
| 2026-06-15 | Planned unsafe historical destination click test. | Codex |
| 2026-06-15 | Planned click route telemetry tests. | Codex |
| 2026-06-15 | Implemented click route telemetry tests. | Codex |
