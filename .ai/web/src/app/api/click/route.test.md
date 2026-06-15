# route.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Tests the tracked click redirect endpoint.

## Planned Change

Add red coverage that the endpoint increments click telemetry only after
resolving a campaign with an HTTPS destination and redirects to that destination.

## Implemented Change

Added coverage for click increments, HTTPS destination redirects, and no-count
fallback for campaigns without destinations.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Planned click route telemetry tests. | Codex |
| 2026-06-15 | Implemented click route telemetry tests. | Codex |
