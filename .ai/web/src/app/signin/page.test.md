# page.test.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Verifies sign-in role query parsing.

## What It Does

- Checks `role=advertiser` selects advertiser.
- Checks missing or invalid roles default to developer.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `resolveInitialRole` tests | Vitest tests | Guard query-param role behavior. |

## Dependencies

- **Internal:** `./page` for `resolveInitialRole`.
- **External:** Vitest and `URLSearchParams`.

## Important Notes / NEVER Change

- Keep tests focused on pure role parsing, not interactive React state.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-13 | Tests failed because `resolveInitialRole` was missing. | Implementation lagged behind test intent. | Implement and export the helper in `page.tsx`. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created documentation for sign-in role tests. | Codex |
