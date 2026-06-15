# ledger-service.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Tests the `recordImpression` ledger service against in-memory adapters.

## Planned Change

Add red coverage for the internal settlement reason returned on success. The
public response stays unchanged, but tests should prove credited and suppressed
outcomes can be classified for aggregate telemetry.

## Implemented Change

Updated success-path assertions to include the internal settlement reason for
credited and shadow-banned impressions.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Planned settlement reason coverage. | Codex |
| 2026-06-15 | Implemented settlement reason coverage. | Codex |
