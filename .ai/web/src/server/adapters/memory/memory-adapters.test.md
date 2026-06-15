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

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Planned campaign telemetry adapter tests. | Codex |
| 2026-06-15 | Implemented campaign telemetry adapter tests. | Codex |
