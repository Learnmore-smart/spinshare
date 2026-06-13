# money.ts

> Last updated: 2026-06-13 | Protection: CRITICAL

## Purpose

Single source of truth for SpinShare integer money math.

## What It Does

- Converts CPM bids to exact per-impression revenue in micro-cents.
- Computes developer credit and SpinShare retention.
- Formats integer cents as USD strings.
- Preserves exact conservation between credit and retention.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `MICROCENTS_PER_CENT` | constant | 1000 micro-cents per cent. |
| `DEVELOPER_SHARE_PERCENT` | constant | Developer revenue share percentage. |
| `perImpressionRevenueMicrocents` | function | Exact CPM-to-impression revenue conversion. |
| `roundHalfUpToCents` | function | Rounds a percentage of revenue to whole cents, capped by available revenue. |
| `computeSplit` | function | Returns exact revenue, developer credit, and retention. |
| `formatCentsAsUsd` | function | Formats integer cents as `0.00` string. |

## Dependencies

- **Internal:** `./types` for `Split`.

## Important Notes / NEVER Change

- Use integer arithmetic only.
- Retention is computed by subtraction so credit + retention equals revenue.
- Developer credit must never exceed the exact per-impression revenue available, or retention becomes negative.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-13 | Property 6 failed for `cpmCents=834` with negative retention. | Half-up rounding credited 1 cent when exact revenue was only 834 micro-cents. | Cap rounded developer credit at the whole cents available in exact revenue. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created documentation for non-negative retention fix. | Codex |
| 2026-06-13 | Implemented developer-credit cap in `roundHalfUpToCents`. | Codex |
