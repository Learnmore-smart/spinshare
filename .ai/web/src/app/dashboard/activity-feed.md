# activity-feed.ts

> Last updated: 2026-06-18 | Protection: STANDARD

## Purpose

Shared pure helpers for rendering impression attempt activity rows in developer
and advertiser dashboards.

## Planned Behavior

- Accept the API/activity repository activity row shape.
- Normalize rows for UI display with status labels, duration labels, credit
  labels, and newest-first ordering.
- Keep this file pure and React-free so both dashboards can share it and tests
  can cover status formatting without DOM setup.

## Implemented Behavior

- `toActivityFeedRows()` maps raw attempt activity into dashboard rows.
- Credited rows are marked `counted`; all other outcomes remain visible with
  zero-credit labels.
- Rows sort newest first by `createdAtMs`.

## Planned Change 2026-06-15 Advertiser Money Events

Accept advertiser event rows in addition to impression attempts. Format
checkout/funding/debit rows with stable labels, amount labels, and newest-first
sorting so the advertiser dashboard can show one explainable timeline.

## Implemented Change 2026-06-15 Advertiser Money Events

`toActivityFeedRows()` now accepts advertiser event rows and formats
`checkoutStarted`, `budgetFunded`, and `budgetDebited` with event-specific
labels and amount labels. Impression attempt formatting remains unchanged.

## Planned Change 2026-06-16 Activity Detail Fields

Add a shared pure helper that turns an `ActivityFeedRow` into stable detail
label/value pairs for ledger UIs. The detail output should include the activity
id, campaign id, status, duration/event label, amount or credit label, created
timestamp, and optional Stripe trace ids (`checkoutSessionId`,
`providerEventId`). Keep this React-free so advertiser and developer activity
views can render richer details without duplicating formatting logic.

## Implemented Change 2026-06-16 Activity Detail Fields

`activityDetailItems()` now returns stable label/value pairs for any normalized
activity row. It emits activity id, campaign id, status, event/duration,
amount/credit, ISO created timestamp, and optional Stripe checkout/provider ids
when present.

## Verification

- 2026-06-18: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts src/app/dashboard/developer/summarize-ledger.test.ts src/app/dashboard/developer/developer-dashboard-parts.test.tsx src/app/dashboard/developer/dashboard.property.test.ts` passed with 21 tests.
- RED/GREEN 2026-06-18: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts src/app/dashboard/developer/developer-dashboard-parts.test.tsx` failed before implementation on the sub-cent credit label and developer details exposure, then passed with 10 tests after implementation.
- 2026-06-18: `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts src/app/dashboard/advertiser/advertiser-activity-feed.test.tsx src/app/dashboard/advertiser/advertiser-dashboard.test.tsx src/app/dashboard/developer/developer-dashboard-parts.test.tsx` passed on 2026-06-15.
- RED before implementation: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts src/app/dashboard/advertiser/advertiser-activity-feed.test.tsx src/app/dashboard/developer/developer-dashboard-parts.test.tsx` failed because `activityDetailItems` and UI details did not exist.
- GREEN after implementation: the same focused command passed with 15 tests, and `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed on 2026-06-16.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Implemented sub-cent display for credited impression rows with up to 3 decimals. | Codex |
| 2026-06-18 | Planned sub-cent display for credited impression rows. | Codex |
| 2026-06-16 | Implemented shared activity detail fields for ledger UIs. | Codex |
| 2026-06-16 | Planned shared activity detail fields for ledger UIs. | Codex |
| 2026-06-15 | Implemented activity feed support for advertiser money events. | Codex |
| 2026-06-15 | Planned activity feed support for advertiser money events. | Codex |
| 2026-06-15 | Created doc before adding shared activity feed helpers. | Codex |
| 2026-06-15 | Synced implemented activity feed helper behavior after green tests. | Codex |

## Planned Change 2026-06-16 Developer Payout Events

Support `developer_event` payout rows in shared feed helpers with payout-specific
labels, amount formatting, provider id detail, and safe provider/error codes.

## Implemented Change 2026-06-16 Developer Payout Events

Shared feed helpers now format `payoutPaid`, `payoutFailed`, and
`payoutBlocked` rows, including provider event/status/code detail fields.

## Planned Change 2026-06-18 Sub-Cent Credited Impressions

Credited impression rows with non-zero revenue but zero whole-cent credit should
not render as `$0.00`. For display only, derive the developer share from
`revenueMicrocents` and `DEVELOPER_SHARE_PERCENT` and format it with sub-cent
precision. Whole-cent balances, payouts, and ledger accounting remain unchanged.

## Implemented Change 2026-06-18 Sub-Cent Credited Impressions

`activityCreditLabel()` now detects credited impression rows with non-zero
`revenueMicrocents` and zero whole-cent credit, derives the display credit from
the configured developer share, and formats that value with up to 3 USD decimal
places.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-18 | `$5 CPM` credited impressions displayed as `$0.00` in recent credit. | Per-impression developer credit is stored in whole cents, so sub-cent rows round to zero before UI formatting. | Display credited non-zero sub-cent rows using derived micro-cent precision from the row revenue. |
