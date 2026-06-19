# money.test.ts

> Last updated: 2026-06-18 | Protection: CRITICAL

## Purpose

Focused unit tests for `reconstructCampaignDelivery` (budget-drift correction).

## What It Does

- Verifies a fresh block fund reports exact purchased views and amount paid.
- Regression: a $5.00 / 1,000-view buy that drifted to a 485c budget after 21 served views still reports 1,000 views and $5.00 (never "991 / $4.95").
- Verifies multi-block budgets that drifted below a round thousand snap up to the correct block count.
- Verifies purchased views never drop below served, raw totals round to the nearest block, and negative/fractional/zero-CPM inputs are handled defensively.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `reconstructCampaignDelivery` suite | tests | Block-grid snapping of purchased views + paid amount. |

## Dependencies

- **Internal:** `./money`.
- **External:** Vitest.

## Important Notes / NEVER Change

- Keep the `$5.00 / 1,000 → not $4.95 / 991` regression: it encodes the reported public-market bug.
- Budgets in fixtures model whole 1,000-view block funds (`cpmCents * blockCount`), optionally minus exact/rounded served spend.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Created unit tests for `reconstructCampaignDelivery`. | Cursor |
