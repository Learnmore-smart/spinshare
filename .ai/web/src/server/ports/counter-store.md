# counter-store.ts

> Last updated: 2026-06-15 | Protection: CRITICAL

## Purpose

Defines the hot-path counter-store port used for impression accounting,
velocity/shadow-ban state, reconciliation, earning caps, and campaign telemetry.

## Planned Change

Add privacy-preserving campaign telemetry methods to the port:

- increment aggregate campaign counters for ad shows, click redirects, credited
  impressions, and non-credit reason buckets.
- read telemetry for a set of campaign ids.
- always return zero-filled telemetry for campaigns with no counts.

## Constraints

- Do not store prompts, request bodies, raw user identifiers, IP addresses, or
  private user content in telemetry.
- Keep telemetry campaign-scoped and aggregate only.
- Preserve the existing money movement and reconciliation contracts.

## Implemented Change

Added `CampaignTelemetry`, the supported metric names, zero-filled telemetry
helper, and `CounterStore` methods for incrementing and reading aggregate
campaign telemetry.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Planned aggregate campaign telemetry counters. | Codex |
| 2026-06-15 | Implemented campaign telemetry port methods. | Codex |
