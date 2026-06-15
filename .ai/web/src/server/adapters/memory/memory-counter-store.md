# memory-counter-store.ts

> Last updated: 2026-06-15 | Protection: CRITICAL

## Purpose

In-memory implementation of the `CounterStore` hot path for local development
and tests.

## Planned Change

Add in-memory campaign telemetry counters matching the production RTDB adapter:

- `shows`
- `clicks`
- `credited`
- non-credit reason buckets: `tooShort`, `invalidToken`, `invalidCampaign`,
  `shadowBanned`, `earningCapped`, `duplicate`

Counts default to zero for campaigns with no telemetry so dashboards can render
stable containers.

## Constraints

- Telemetry must stay aggregate and campaign-scoped.
- No prompts, raw request content, or private user identifiers may be stored.
- Existing idempotent money behavior must not change.

## Implemented Change

Added an in-memory campaign telemetry map with zero-filled reads and independent
increment counters for shows, clicks, credited impressions, and non-credit
reason buckets.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Planned privacy-preserving campaign telemetry counters. | Codex |
| 2026-06-15 | Implemented in-memory campaign telemetry counters. | Codex |
