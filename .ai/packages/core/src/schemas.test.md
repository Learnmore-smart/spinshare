# schemas.test.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Tests shared validation schemas in `@spinshare/core`.

## What It Does

- Verifies campaign, funding, and tracking request validation.
- Guards money bounds and user-facing error cases.

## Public API

| Name | Type | Description |
|------|------|-------------|
| Schema tests | Vitest tests | Regression coverage for core Zod schemas. |

## Dependencies

- External: `vitest`.
- Internal: `./schemas`.

## Important Notes / NEVER Change

- Tests should verify behavior and bounds, not implementation details.
- New schema behavior must be proven red before implementation.

## Planned Change

Add failing tests for the tracking viewability contract:

- accept `viewDurationMs` at exactly `VIEWABILITY_MIN_MS`
- reject missing, non-integer, and below-minimum `viewDurationMs`

These tests must fail before the schema change and pass after implementation.

## Previous Planned Change

Add failing tests for the public advertiser checkout schema:

- accepts a valid public/private checkout payload
- rejects non-HTTPS destination URLs
- rejects block counts that would exceed the funding maximum

## Implemented Test

Added schema tests for valid public checkout, private leaderboard submissions, HTTPS-only destination URLs, and checkout totals that exceed the funding maximum.

## Implemented Test: 3-Second Viewability

Added schema tests that accept exactly 3000 ms and reject below-minimum,
missing, non-integer, and non-numeric view durations.

## Verification

- Initial focused run failed because `advertiserCheckoutSchema` was missing.
- Final `corepack pnpm@9.12.0 --filter @spinshare/core test` passed: 5 files, 29 tests.
- Initial viewability focused run failed because `trackRequestSchema` still
  accepted below-minimum/missing durations.
- Final root test run passed: core 5 files, 31 tests.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created doc before adding advertiser checkout schema tests. | Codex |
| 2026-06-13 | Synced doc with final advertiser checkout schema tests and verification. | Codex |
| 2026-06-13 | Documented 3-second tracking schema regression tests before editing tests. | Codex |
| 2026-06-13 | Synced doc with passing 3-second tracking schema tests. | Codex |
