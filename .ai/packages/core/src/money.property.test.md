# money.property.test.ts

> Last updated: 2026-06-13 | Protection: CRITICAL

## Purpose

Property-based tests for SpinShare core money math.

## What It Does

- Verifies CPM to micro-cent revenue conversion.
- Verifies developer credit rounding and capping.
- Verifies split conservation and non-negative retention.

## Public API

| Name | Type | Description |
|------|------|-------------|
| Property 4 | test | Per-impression revenue equals CPM/1000. |
| Property 5 | test | Developer credit is rounded and capped to available revenue. |
| Property 6 | test | Credit plus retention exactly conserves revenue. |

## Dependencies

- **Internal:** `./money`.
- **External:** Vitest, fast-check.

## Important Notes / NEVER Change

- Keep `numRuns: 100` or higher.
- Include low-CPM edge cases where rounded credit could otherwise exceed exact revenue.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-13 | Randomized root test found negative retention for low CPM. | Property 5 assumed uncapped half-up rounding even when rounded credit exceeded total exact revenue. | Update the property to model the money-safe cap and keep Property 6 non-negative. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created documentation for money property update. | Codex |
| 2026-06-13 | Updated Property 5 reference model for capped rounded credit. | Codex |
