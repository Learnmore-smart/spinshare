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

## Planned Change (2026-06-15 Cumulative Viewability)

Update schema coverage so short positive view segments are accepted as progress
updates, while zero, negative, missing, fractional, non-numeric, and NaN values
remain invalid.

## Planned Change (2026-06-15 Destination URL Safety)

Add red coverage for suspicious destination URLs that are syntactically valid
HTTPS URLs but unsafe for ads:

- credentialed URLs such as `https://user:pass@example.com/`;
- local hostnames such as `https://localhost/`;
- IP literal destinations such as `https://127.0.0.1/` and `https://10.0.0.1/`;
- custom-port destinations such as `https://example.com:8443/`.

## Implemented Change (2026-06-15 Destination URL Safety)

Added checkout schema coverage for syntactically valid but unsafe URLs:
credentialed URLs, localhost/local hostnames, IP literals, and custom ports.

## Planned Change (2026-06-15 Dashboard Block Funding)

Add red coverage for a funding checkout schema that accepts whole positive
block counts and rejects arbitrary `amountCents` payloads. This keeps dashboard
funding aligned with the public homepage "buy blocks" model.

## Implemented Change (2026-06-15 Dashboard Block Funding)

Added schema coverage for valid `{ campaignId, blockCount }`, invalid block
counts, and legacy amount-only payload rejection.

## Planned Change (2026-06-16 Deterministic Ad Text Safety)

Add RED coverage for unsafe ad copy before implementation:

- seed phrase/private key collection;
- password/OTP collection;
- crypto giveaway/airdrop lures;
- account/wallet verification lures.

Also cover a legitimate security-tool ad so the first pass stays narrow and does
not block ordinary password-manager/security education copy.

## Implemented Change (2026-06-16 Deterministic Ad Text Safety)

Added schema tests for unsafe ad text rejection, narrow allowed security-tool
copy, and public checkout inheritance of the same rule.

## Planned Change (2026-06-16 Destination URL Anti-Phishing Hardening)

Add RED coverage that public checkout rejects:

- punycode/IDN domains;
- single-label hostnames;
- common shortener domains.

Keep valid ordinary HTTPS domains accepted.

## Implemented Change (2026-06-16 Destination URL Anti-Phishing Hardening)

Added checkout-schema coverage for punycode/IDN domains, single-label hostnames,
and common shortener domains (`bit.ly`, `tinyurl.com`, `t.co`).

## Verification (2026-06-16 Destination URL Anti-Phishing Hardening)

- RED before implementation:
  `corepack pnpm@9.12.0 --filter @spinshare/core test -- src/schemas.test.ts`
  failed because at least one phishing-prone/review-bypass URL was accepted.
- GREEN after implementation: the same focused command passed with 24 tests.

## Verification (2026-06-16 Deterministic Ad Text Safety)

- RED before implementation:
  `corepack pnpm@9.12.0 --filter @spinshare/core test -- src/schemas.test.ts`
  failed because unsafe copy was accepted and `reviewAdTextSafety` did not
  exist.
- GREEN after implementation: the same focused command passed with 23 tests.

## Planned Change (2026-06-17 Create Campaign Checkout Blocks)

Add RED coverage that `createCampaignSchema` accepts an optional whole positive
`blockCount` and rejects invalid block counts. This protects the dashboard
direct-checkout path while keeping block-count validation centralized.

## Implemented Change (2026-06-17 Create Campaign Checkout Blocks)

Added schema coverage that optional valid `blockCount` is preserved and invalid
block counts are rejected.

RED verification before implementation:
`corepack pnpm@9.12.0 --filter @spinshare/core test -- src/schemas.test.ts`
failed because `blockCount` was stripped and invalid values were accepted.

GREEN verification after implementation:
`corepack pnpm@9.12.0 --filter @spinshare/core test -- src/schemas.test.ts`
passed 26 tests.

## Verification (2026-06-15 Dashboard Block Funding)

- Focused: `corepack pnpm@9.12.0 --filter @spinshare/core test -- src/schemas.test.ts`.
- Full: `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Implemented create campaign optional blockCount schema tests. | Codex |
| 2026-06-17 | Planned create campaign optional blockCount schema tests. | Codex |
| 2026-06-16 | Implemented deterministic URL anti-phishing tests. | Codex |
| 2026-06-16 | Planned deterministic URL anti-phishing tests. | Codex |
| 2026-06-16 | Implemented deterministic ad text safety tests. | Codex |
| 2026-06-16 | Planned deterministic ad text safety tests. | Codex |
| 2026-06-15 | Implemented dashboard block funding schema tests. | Codex |
| 2026-06-15 | Planned dashboard block funding schema tests. | Codex |
| 2026-06-15 | Implemented destination URL safety tests. | Codex |
| 2026-06-15 | Planned destination URL safety tests. | Codex |
| 2026-06-13 | Created doc before adding advertiser checkout schema tests. | Codex |
| 2026-06-13 | Synced doc with final advertiser checkout schema tests and verification. | Codex |
| 2026-06-13 | Documented 3-second tracking schema regression tests before editing tests. | Codex |
| 2026-06-13 | Synced doc with passing 3-second tracking schema tests. | Codex |
| 2026-06-15 | Planned cumulative viewability schema tests. | Codex |
