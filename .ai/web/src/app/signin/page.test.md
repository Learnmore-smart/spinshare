# page.test.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Verifies sign-in role query parsing.

## What It Does

- Checks `role=advertiser` selects advertiser.
- Checks missing or invalid roles default to developer.
- Checks the sign-in money-stream background has enough rows, many repeated `🤑` icons per row, and alternating movement directions.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `resolveInitialRole` tests | Vitest tests | Guard query-param role behavior. |
| `MONEY_STREAM_ROWS` tests | Vitest tests | Guard money-stream density and alternating direction. |

## Dependencies

- **Internal:** `./page` for `resolveInitialRole`.
- **External:** Vitest and `URLSearchParams`.

## Important Notes / NEVER Change

- Keep tests focused on pure exported state/helpers, not interactive React state.
- Keep the money-stream assertions aligned with the visual requirement that the sign-in page is filled with moving money rows, not sparse lines.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-13 | Tests failed because `resolveInitialRole` was missing. | Implementation lagged behind test intent. | Implement and export the helper in `page.tsx`. |

## Planned Regression: Money Stream Rows

Add a focused test for exported `MONEY_STREAM_ROWS` before implementation:

- There must be enough rows to fill the sign-in background.
- Rows must alternate directions.
- Each row must contain many repeated money icons so the background is not sparse.
- The repeated money icon must be `🤑`.

## Implemented Regression

The test imports `MONEY_STREAM_ROWS`, requires at least eight rows, at least twelve icons per row, the exact `🤑` glyph for every icon, and alternating adjacent directions.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/page.test.tsx src/app/signin/page.test.ts` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created documentation for sign-in role tests. | Codex |
| 2026-06-13 | Documented money-stream row regression test before editing tests. | Codex |
| 2026-06-13 | Documented `🤑` stream icon assertion before editing tests. | Codex |
| 2026-06-13 | Synced docs with final money-stream row regression assertions. | Codex |
