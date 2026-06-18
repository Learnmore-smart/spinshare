# lib.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Tests pure advertiser dashboard helpers.

## Planned Change

Add red coverage for telemetry aggregation and CTR formatting so the dashboard
can show stable zero-state containers.

## Implemented Change

Added tests for zero telemetry totals, aggregate telemetry sums, non-credit
totals, and CTR formatting.

## Planned Change 2026-06-15 Block Funding Helpers

Add red coverage for whole-number block validation. Valid examples should
return `{ ok: true, blocks }`; empty, zero, negative, decimal, and above-max
values should fail.

## Implemented Change 2026-06-15 Block Funding Helpers

Added tests for valid whole block counts, invalid/malformed counts, and values
above `ADVERTISER_CHECKOUT_BLOCKS_MAX`.

## Implemented Change 2026-06-18 Stats And Delivery Helpers

Added coverage for precise three-decimal spend formatting, fractional campaign
spend totals, snapped delivery denominators for purchased 1,000-impression
blocks, derived display status, and never-funded detection. Corrected the
multi-block fixture to use `997` cents remaining for an intended 2-block,
`$5 CPM` campaign.

## Planned Change 2026-06-18 Needs-Link Status Test

Add regression coverage that a funded campaign without `destinationUrl` derives
to `needsLink` rather than `active`, matching the server biddability rule.

## Implemented Change 2026-06-18 Needs-Link Status Test

Added the `needsLink` regression. RED run failed with `active`; GREEN run
passed after `displayStatus()` was updated.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Implemented needs-link status regression coverage. | Codex |
| 2026-06-18 | Planned needs-link status regression coverage. | Codex |
| 2026-06-18 | Implemented stats/delivery helper coverage and corrected fixture math. | Codex |
| 2026-06-15 | Implemented block-count funding helper tests. | Codex |
| 2026-06-15 | Planned block-count funding helper tests. | Codex |
| 2026-06-15 | Planned telemetry helper tests. | Codex |
| 2026-06-15 | Implemented telemetry helper tests. | Codex |
