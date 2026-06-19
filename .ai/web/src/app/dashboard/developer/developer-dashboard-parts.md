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

## Bug Fix Plan 2026-06-19 Adaptive Payout Threshold Decimals

Hero payout copy showed `$5.000` / `$0.000` because `moneyMicrocents3` always
used `toFixed(3)`. User expectation: default to standard currency (`$5.00`,
`$0.00`) and only show a third decimal when sub-cent precision is meaningful
(e.g. `还差 $4.795`). Fix: match the existing `formatMicrocentsAsUsd` trim in
`activity-feed.ts` — `toFixed(3)` then drop one trailing zero when present.

## Implemented Bug Fix 2026-06-19 Adaptive Payout Threshold Decimals

`moneyMicrocents3` now renders `$5.00` for whole-dollar thresholds and `$4.925`
/ `$4.795` when the third decimal is significant.

## Bug Fix Plan 2026-06-19 Traceable Recent Credit Rows

User feedback showed the Recent credit table displaying the same campaign id on
every impression row, making screenshots unusable for support lookup. Root
cause: `ActivityTable` and `ActivityList` hide the unique `activityId` and put
`campaignId` in the primary visible identifier column. Fix strategy: render the
unique `activityId` directly in the developer-facing row, keep `campaignId`
visible as campaign context, and combine status + duration in the event column
so no useful row detail is lost. Regression risk is limited to the developer
activity presentation; CSV already exports `activityId`.

## Implemented Bug Fix 2026-06-19 Traceable Recent Credit Rows

`ActivityList` now uses `activityId` as the primary visible identifier and keeps
campaign/status/duration on the secondary line. `ActivityTable` now labels the
first column as the activity id, renders `row.activityId` there, keeps
`campaignId` in the campaign column, and combines status + duration in the
event column.

## Verification

- 2026-06-19: RED focused test failed because mobile/table rows did not contain `activityId`; GREEN focused test passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/developer/developer-dashboard-parts.test.tsx`.
- 2026-06-19: Related activity/dashboard tests passed with 21 tests:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts src/app/dashboard/developer/developer-activity-view.test.tsx src/app/dashboard/developer/developer-activity-view-render.test.tsx src/app/dashboard/developer/developer-activity-context.test.ts src/app/dashboard/developer/developer-dashboard-parts.test.tsx`.
- 2026-06-19: `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed after rerun.
- 2026-06-18: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts src/app/dashboard/developer/summarize-ledger.test.ts src/app/dashboard/developer/developer-dashboard-parts.test.tsx src/app/dashboard/developer/dashboard.property.test.ts` passed with 21 tests.
- RED/GREEN 2026-06-18: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts src/app/dashboard/developer/developer-dashboard-parts.test.tsx` failed before implementation on developer row details exposure, then passed with 10 tests after implementation.
- 2026-06-18: `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts src/app/dashboard/advertiser/advertiser-activity-feed.test.tsx src/app/dashboard/advertiser/advertiser-dashboard.test.tsx src/app/dashboard/developer/developer-dashboard-parts.test.tsx` passed on 2026-06-15.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Implemented traceable Recent credit row identifiers. | Codex |
| 2026-06-19 | Planned traceable Recent credit row identifiers. | Codex |
| 2026-06-18 | Planned fixed-precision payout display formatter for overview hero copy. | Codex |
| 2026-06-18 | Added optional display labels for earning cap meters. | Codex |
| 2026-06-18 | Removed raw details from developer activity row rendering. | Codex |
| 2026-06-18 | Planned removal of raw developer activity row details. | Codex |
| 2026-06-16 | Implemented developer activity detail rendering. | Codex |
| 2026-06-16 | Planned developer activity detail rendering. | Codex |
| 2026-06-15 | Created doc before updating developer activity presentation rows. | Codex |
| 2026-06-15 | Synced implemented attempt-level activity presentation rows. | Codex |
