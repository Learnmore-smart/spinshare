# route.test.ts

> Last updated: 2026-06-18 | Protection: STANDARD

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

## Planned Regression: Private Leaderboard Campaigns

Add a failing test that funded campaigns with `publicOnLeaderboard: false` are omitted from `/api/market` rows and summary counts.

## Implemented Regression: Private Leaderboard Campaigns

Added a route test that seeds public and private funded campaigns and verifies `/api/market` only returns the public campaign.

## Implemented Regression (2026-06-18): Budget-Drift Display

Sort/served fixtures now use coherent whole-block budgets and assert the snapped `targetImpressions` plus new `totalPaidCents`/`totalPaidUsd`. Added a dedicated test seeding a $5.00 CPM campaign with a drifted 485c budget and 21 served views, asserting `targetImpressions === 1000`, `totalPaidCents === 500`, `totalPaidUsd === "$5.00"` (the reported "991 / $4.95" bug).

## Verification

- Initial run failed because `./route` was missing.
- After implementation, the focused Vitest command passed with this route test included.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-18 | Market showed "$4.95 / 991" for a $5.00 / 1,000-view buy. | Purchased views + total paid were derived from the drifting whole-cent budget. | Added a drift regression and switched fixtures to whole-block budgets asserting snapped views and exact paid amount. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Public rows expose rank + CPM only; summary adds `totalServedImpressions`; removed per-row spend/delivery fields and budget-drift market regression. | Cursor |
| 2026-06-18 | Added budget-drift regression; updated fixtures to whole-block budgets + totalPaid assertions. | Cursor |
| 2026-06-16 | Added regression for omitting pending/rejected review campaigns from market. | Codex |
| 2026-06-13 | Created doc for market route tests | Codex |
| 2026-06-13 | Documented private leaderboard filtering regression test | Codex |
| 2026-06-13 | Synced docs with final private leaderboard filtering test. | Codex |
