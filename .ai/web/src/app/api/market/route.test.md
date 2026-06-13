# route.test.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Tests for the public homepage market endpoint.

## What It Does

- Verifies the endpoint returns only funded, biddable campaigns.
- Verifies campaigns are sorted by winning bid order.
- Verifies public summary fields are derived from repository data.

## Public API

| Name | Type | Description |
|------|------|-------------|
| Market route tests | Vitest tests | Guardrails for `GET /api/market` |

## Props / Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| None | N/A | No | Test file |

## Dependencies

- External: `vitest`.
- Internal: `@/server/container` and memory adapters for seeded repository tests.

## Important Notes / NEVER Change

- Test the public JSON contract, not private implementation details.
- Keep fake campaigns only in tests; production endpoint must read the configured repository.

## Planned Change

Add failing tests before implementing `GET /api/market`.

## Verification

- Initial run failed because `./route` was missing.
- After implementation, the focused Vitest command passed with this route test included.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created doc for market route tests | Codex |
