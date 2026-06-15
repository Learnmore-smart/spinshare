# route.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Tests authenticated advertiser campaign API behavior.

## Planned Change

Add red coverage that `GET /api/campaigns` returns zero-filled telemetry for
quiet campaigns and populated telemetry for campaigns with aggregate counters.

## Implemented Change

Added coverage for zero-filled campaign telemetry, owned-campaign scoping, and
durable ledger counts contributing to credited impressions.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Planned campaign telemetry API tests. | Codex |
| 2026-06-15 | Implemented campaign telemetry API tests. | Codex |
