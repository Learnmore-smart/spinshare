# api-client.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Unit tests for the CLI API client.

## What It Does

- Verifies base URL resolution.
- Verifies ad and track response parsing.
- Verifies HTTP request shape for ad fetch, tracking, and device flow.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `CliApiClient` tests | Vitest suite | Request and parser coverage. |

## Dependencies

- External: `vitest`.
- Internal: `./api-client.js`.

## Important Notes / NEVER Change

- Tests must use injected fetch stubs, not real network calls.

## Planned Change (2026-06-15)

Add a failing regression test proving explicit and environment-provided
`https://spinshare.dev/` values resolve to `https://www.spinshare.dev`.

## Implemented Test (2026-06-15)

Added regression coverage for both explicit and `SPINSHARE_BASE_URL`
production apex values.

## Verification (2026-06-15)

- Red: focused CLI API client test failed on the expected base URL mismatch.
- Green: focused CLI API client test passed after the normalizer was added.
- Full CLI test suite passed.

## Planned Change

Add a failing assertion that `reportImpression` sends both `campaignId` and
`viewDurationMs`.

## Implemented Test

The tracking request test now asserts the body is
`{ campaignId, viewDurationMs }` and that the bearer token remains unchanged.

## Verification

- Red run failed because the old second argument was treated as the bearer
  token.
- Final focused CLI API client test passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Added regression coverage for canonical CLI production base URL resolution. | Codex |
| 2026-06-13 | Created doc before adding CLI API view duration test. | Codex |
| 2026-06-13 | Synced doc with passing CLI API payload test. | Codex |
