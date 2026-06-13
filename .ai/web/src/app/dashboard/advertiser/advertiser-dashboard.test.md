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

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created doc before adding advertiser dashboard copy test. | Codex |
