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

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented block-count funding helper tests. | Codex |
| 2026-06-15 | Planned block-count funding helper tests. | Codex |
| 2026-06-15 | Planned telemetry helper tests. | Codex |
| 2026-06-15 | Implemented telemetry helper tests. | Codex |
