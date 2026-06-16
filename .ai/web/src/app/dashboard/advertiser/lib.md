# lib.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Pure helper functions and dashboard view types for the advertiser dashboard.

## Planned Change

Add campaign telemetry view types and helper functions for totals, CTR, and
non-credit diagnostics. Helpers should be pure so tests can cover zero-default
and formatting behavior without React.

## Constraints

- Keep money formatting integer-cent based.
- Do not derive or display private user data.
- Zero values must format consistently for always-visible dashboard containers.

## Implemented Change

Added telemetry view types, zero constants, sum helpers, non-credit totals,
count formatting, and CTR formatting.

## Planned Change 2026-06-15 Block Funding Helpers

Replace dashboard funding-dollar validation with block-count validation. The
campaign card should collect whole 1,000-impression blocks and let the server
derive money from campaign CPM.

## Implemented Change 2026-06-15 Block Funding Helpers

Added `validateFundingBlocks()`, returning `{ ok: true, blocks }` for whole
positive block counts and errors for empty, zero, negative, decimal, malformed,
or above-max values.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented block-count funding helper. | Codex |
| 2026-06-15 | Planned block-count funding helper. | Codex |
| 2026-06-15 | Planned dashboard telemetry helpers. | Codex |
| 2026-06-15 | Implemented dashboard telemetry helpers. | Codex |
