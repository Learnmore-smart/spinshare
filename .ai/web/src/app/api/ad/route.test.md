# route.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Tests route-level behavior for `GET /api/ad`.

## Planned Change

Add red coverage that a successful ad selection increments the aggregate show
counter and rewrites clickable destinations to `/api/click`.

## Implemented Change

Added route coverage for show-count increments and tracked click URL rewriting.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Planned ad-route telemetry tests. | Codex |
| 2026-06-15 | Implemented ad-route telemetry tests. | Codex |
