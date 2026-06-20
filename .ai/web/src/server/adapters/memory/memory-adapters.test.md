# memory-adapters.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Tests the in-memory and mock adapters that back local development and service
unit tests.

## Planned Change

Add red coverage for campaign telemetry:

- a new campaign telemetry read should be zero-filled before any counts.
- increments should accumulate shows, clicks, credited impressions, and reason
  buckets without affecting money counters.

## Implemented Change

Added coverage for zero-filled campaign telemetry and aggregate metric
increments that do not move money.

## Planned Change 2026-06-17 Mock Device Approval Claims

Add regression coverage proving `MockAuthProvider.approveDeviceByUserCode`
preserves the browser-resolved email claim when it mints the device access
token. This is required for local same-email advertiser dashboard ownership.

## Implemented Change 2026-06-17 Mock Device Approval Claims

Added a regression test that starts a mock device flow, approves by user code
with `{ userId, email }`, polls the device token, and validates that
`validateToken(accessToken)` returns both the user id and email claim.

## Planned Change 2026-06-18 Destination-Required Biddability Fixtures

Update MemoryCampaignRepository biddability tests to include destination URLs
for campaigns expected to bid, matching the new repository contract that paid
campaigns without a link stay out of ad selection.

## Implemented Change 2026-06-18 Destination-Required Biddability Fixtures

Updated the biddability and review-status fixtures to include
`https://learnx.pro/`, then reran the memory adapter suite successfully.

## Planned Change 2026-06-20 Purchased Inventory Metadata

Extend mock checkout coverage to assert that exact purchased impressions survive
session creation and provider-verified funding lookup.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Planned mock checkout purchased-inventory round-trip coverage. | Codex |
| 2026-06-18 | Implemented destination-required memory biddability fixture update. | Codex |
| 2026-06-18 | Planned destination-required memory biddability fixture update. | Codex |
| 2026-06-17 | Added regression for mock device approval email claims. | Codex |
| 2026-06-17 | Planned regression for mock device approval email claims. | Codex |
| 2026-06-16 | Added regression for updating campaign review status before bidding. | Codex |
| 2026-06-15 | Planned campaign telemetry adapter tests. | Codex |
| 2026-06-15 | Implemented campaign telemetry adapter tests. | Codex |
