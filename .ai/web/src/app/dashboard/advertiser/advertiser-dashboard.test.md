# advertiser-dashboard.test.tsx

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Static render tests for advertiser dashboard messaging.

## What It Does

- Renders the dashboard shell to static markup.
- Verifies advertiser-facing policy copy is visible.

## Public API

| Name | Type | Description |
|------|------|-------------|
| Dashboard copy tests | Vitest suite | Advertiser dashboard messaging coverage. |

## Dependencies

- External: `vitest`, `react-dom/server`.
- Internal: `./advertiser-dashboard`.

## Important Notes / NEVER Change

- Tests should assert visible copy rather than implementation classes.

## Planned Change

Add a failing static-render test that requires "3-second minimum views".

## Planned Change (2026-06-15)

Add static-render coverage for always-visible telemetry containers. The
dashboard should show zero values before campaigns or traffic are loaded.

## Implemented Change (2026-06-15)

Static render coverage now asserts the telemetry containers and zero values are
present before campaign data loads.

## Planned Change (2026-06-15 Activity UI)

Add static-render coverage that the dashboard includes the activity feed shell
before asynchronous data loads.

## Verification (2026-06-15)

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Implemented Change

The dashboard static-render test now asserts the advertiser dashboard contains
the visible `3-second minimum views` policy text.

## Verification

- Green: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/track/route.test.ts src/app/page.test.tsx src/app/dashboard/advertiser/advertiser-dashboard.test.tsx` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created doc before adding advertiser dashboard copy test. | Codex |
| 2026-06-13 | Synced docs with advertiser dashboard copy test. | Codex |
| 2026-06-15 | Planned zero-state telemetry container coverage. | Codex |
| 2026-06-15 | Implemented zero-state telemetry container coverage. | Codex |
| 2026-06-15 | Planned advertiser activity shell coverage. | Codex |
