# developer-dashboard-parts.tsx

> Last updated: 2026-06-18 | Protection: STANDARD

## Purpose

Shared developer dashboard presentation components.

## Planned Change

Update `ActivityList` and `ActivityTable` to render attempt-level activity feed
rows, including status and duration, while preserving existing earnings widgets.

## Implemented Change

`ActivityList` and `ActivityTable` now render `ActivityFeedRow` records keyed by
`activityId`. Rows show campaign id, attempt status, duration, and credit label;
credited rows use earning colors while non-credited attempts stay muted.

## Planned Change 2026-06-16 Activity Detail Rendering

Use the shared activity detail helper to expose audit details in both mobile
cards and the desktop activity table. Mobile cards should keep a compact
disclosure below the row summary; desktop rows should add a details column with
the same label/value pairs.

## Implemented Change 2026-06-16 Activity Detail Rendering

`ActivityList` now renders a compact `Details` disclosure under each mobile
activity card. `ActivityTable` now adds a details column with the same
label/value pairs. Both use `activityDetailItems(row, { amountLabel: "Credit" })`.

## Planned Change 2026-06-18 Remove Raw User-Facing Details

Remove the developer activity row details disclosures from mobile cards and the
desktop table. The row should stay focused on duration, campaign, event, and
credit. Raw activity ids, timestamps, and trace fields are better kept in CSV,
API responses, and admin/debug surfaces rather than the normal user dashboard.

## Implemented Change 2026-06-18 Remove Raw User-Facing Details

`ActivityList` and `ActivityTable` now render only the compact activity summary.
The mobile `Details` disclosure and desktop `Details` column were removed from
the developer-facing dashboard.

## Implemented Change 2026-06-18 Display Labels for Cap Meters

`LimitMeter` now accepts an optional `usedLabel`, allowing the dashboard to show
sub-cent display earnings such as `$0.012 / $20.00` while keeping the progress
calculation based on whole-cent cap accounting.

## Planned Change 2026-06-18 Fixed-Precision Payout Display Labels

Add a shared developer-dashboard formatter for display micro-cent amounts that
must render exactly 3 decimals. The immediate caller is the overview hero's
payout-threshold copy, which should display `$4.985` remaining toward the
`$5.000` goal when the visible balance is `$0.015`.

## Verification

- 2026-06-18: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts src/app/dashboard/developer/summarize-ledger.test.ts src/app/dashboard/developer/developer-dashboard-parts.test.tsx src/app/dashboard/developer/dashboard.property.test.ts` passed with 21 tests.
- RED/GREEN 2026-06-18: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts src/app/dashboard/developer/developer-dashboard-parts.test.tsx` failed before implementation on developer row details exposure, then passed with 10 tests after implementation.
- 2026-06-18: `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts src/app/dashboard/advertiser/advertiser-activity-feed.test.tsx src/app/dashboard/advertiser/advertiser-dashboard.test.tsx src/app/dashboard/developer/developer-dashboard-parts.test.tsx` passed on 2026-06-15.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Planned fixed-precision payout display formatter for overview hero copy. | Codex |
| 2026-06-18 | Added optional display labels for earning cap meters. | Codex |
| 2026-06-18 | Removed raw details from developer activity row rendering. | Codex |
| 2026-06-18 | Planned removal of raw developer activity row details. | Codex |
| 2026-06-16 | Implemented developer activity detail rendering. | Codex |
| 2026-06-16 | Planned developer activity detail rendering. | Codex |
| 2026-06-15 | Created doc before updating developer activity presentation rows. | Codex |
| 2026-06-15 | Synced implemented attempt-level activity presentation rows. | Codex |
