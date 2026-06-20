# summarize-ledger.ts

> Last updated: 2026-06-18 | Protection: STANDARD

## Purpose

Pure developer dashboard aggregation for ledger entries.

## What It Does

- Builds dashboard summary totals from durable ledger entries.
- Builds activity rows and cumulative chart points.
- Formats earnings display strings for the overview cards with up to 3 decimals.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `summarizeLedger` | Function | Converts developer ledger entries into dashboard summary data. |
| `buildChartSeries` | Function | Builds cumulative chart points for a selected time range. |

## Dependencies

- **Internal:** `@spinshare/core` money constants and `LedgerEntry` type.

## Planned Change 2026-06-18 Sub-Cent Dashboard Summary

Dashboard summary display strings should aggregate visible sub-cent developer
credit for credited ledger rows where `developerCreditCents` is zero but
`revenueMicrocents` is non-zero. Whole-cent accounting fields remain unchanged
for payout/cap enforcement until a broader balance storage migration is done.

## Implemented Change 2026-06-18 Sub-Cent Dashboard Summary

`summarizeLedger()` now keeps whole-cent accounting totals while adding
display micro-cent totals. Overview strings and chart display values use those
display totals, formatted with a two-decimal minimum and three-decimal maximum
so four `$5 CPM` impressions display as `$0.012`.

## Verification

- 2026-06-18: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts src/app/dashboard/developer/summarize-ledger.test.ts src/app/dashboard/developer/developer-dashboard-parts.test.tsx src/app/dashboard/developer/dashboard.property.test.ts` passed with 21 tests.
- 2026-06-18: `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Agent Decisions / Thoughts

- **2026-06-18 Codex:** Keep `*EarningsCents` fields as whole-cent accounting
  values. Use display micro-cents only for dashboard strings and chart display,
  so the UI stops hiding sub-cent earned value without pretending payout
  eligibility has already migrated.

## Important Notes / NEVER Change

- Keep this module pure and I/O-free.
- Do not mutate input ledger entries.
- Be explicit when a field is display precision versus payout/accounting cents.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Implemented sub-cent dashboard summary display with up to 3 decimals. | Codex |
| 2026-06-18 | Created doc and planned sub-cent dashboard summary display. | Codex |

## Planned Change 2026-06-20 Welcome Gift Row Identity

Add a normalized `ledgerType` to each `LedgerActivityRow`. Detect both typed
`signup_bonus` rows and legacy deterministic `signup_bonus:` ids so downstream
presentation can identify the welcome gift without parsing campaign or amount
fields. Keep the bonus in earnings totals and chart series, but continue to
exclude it from `impressionCount`.

## Agent Decisions / Thoughts Addendum

- **2026-06-20 Codex:** Preserve ledger identity in the pure summary model and
  adapt it at the activity boundary. This keeps the durable ledger as the only
  source of truth and avoids writing a duplicate activity record.

## Change History Addendum

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Planned normalized signup-bonus row identity for welcome-gift presentation. | Codex |
