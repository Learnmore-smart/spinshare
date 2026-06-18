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

## Planned Regression: Clean Split Sign-In Layout

Update sign-in tests before implementation so they require:

- Large left-side balance headline copy.
- Supporting private-dashboard copy.
- The right-side auth panel label.
- Developer and advertiser role labels.
- No dependency on the dense money-stream background export.

## Implemented Regression: Clean Split Sign-In Layout

The sign-in test now imports `SIGNIN_PAGE_COPY`, keeps the role parsing coverage, and verifies the visible clean split sign-in copy contract.

## Planned Regression 2026-06-16 Local Sample Credentials Entry

Add focused pure-helper coverage before implementation:

- `localCredentialsEnabledFromEnv()` returns true only when
  `NEXT_PUBLIC_SPINSHARE_LOCAL_CREDENTIALS=1`.
- `localTestCredentialsForRole()` returns the fixed developer or advertiser
  local test account so the UI cannot accept arbitrary browser-provided ids.

## Implemented Regression 2026-06-16 Local Sample Credentials Entry

The sign-in tests now import `localCredentialsEnabledFromEnv()` and
`localTestCredentialsForRole()`, verifying the public local flag and the fixed
developer/advertiser credentials used by the UI.

## Planned Regression 2026-06-16 Advertiser Callback Role

Add a focused pure-helper test before implementation:

- `resolveInitialRole(new URLSearchParams("callbackUrl=/dashboard/advertiser"))`
  should return `advertiser`.
- Nested advertiser dashboard callbacks should also return `advertiser`.
- Explicit `role=developer` should still win over an advertiser callback.

This prevents the post-purchase advertiser dashboard path from presenting the
developer role by default.

## Implemented Regression 2026-06-16 Advertiser Callback Role

`page.test.ts` now covers advertiser dashboard callback inference, nested
advertiser dashboard callback inference, and explicit developer role precedence
over an advertiser callback.

## Verification: Clean Split Sign-In Layout

- Red: focused sign-in test failed before implementation because `SIGNIN_PAGE_COPY` was missing.
- Green: focused sign-in test passed after implementation.

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
| 2026-06-16 | Implemented advertiser callback role regression. | Codex |
| 2026-06-16 | Planned advertiser callback role regression. | Codex |
| 2026-06-16 | Added local credentials sign-in helper coverage. | Codex |
| 2026-06-16 | Planned local credentials sign-in helper coverage. | Codex |
| 2026-06-13 | Created documentation for sign-in role tests. | Codex |
| 2026-06-13 | Documented money-stream row regression test before editing tests. | Codex |
| 2026-06-13 | Documented `🤑` stream icon assertion before editing tests. | Codex |
| 2026-06-13 | Synced docs with final money-stream row regression assertions. | Codex |
| 2026-06-13 | Documented clean split sign-in layout regression before editing tests. | Codex |
| 2026-06-13 | Synced clean split sign-in layout regression with red-green verification. | Codex |
