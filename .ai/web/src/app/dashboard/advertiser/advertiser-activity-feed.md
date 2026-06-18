# advertiser-activity-feed.tsx

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Advertiser dashboard activity feed component.

## Planned Behavior

- Render loading, error, empty, and ready states.
- Show recent impression attempt outcomes for owned campaigns.
- Keep the feed compact and operational: campaign id, status, duration, and
  developer credit/billing outcome.

## Implemented Behavior

- `AdvertiserActivityFeed` renders loading, error, empty, and ready states.
- Ready rows display campaign id, attempt status, duration, and credit label.
- Credited rows receive counted styling hooks so billable outcomes are visually
  distinct from non-billed attempts.

## Planned Change 2026-06-15 Advertiser Money Events

Render both impression attempts and advertiser money events in the same recent
activity list. Money event rows should show event labels and amount labels
instead of forcing duration/credit semantics onto checkout or funding events.

## Implemented Change 2026-06-15 Advertiser Money Events

The component receives normalized rows from `activity-feed.ts`, so no separate
branching was needed here. Existing row rendering now displays money event
labels and amount labels through the normalized `statusLabel`, `durationLabel`,
and `creditLabel` fields.

## Planned Change 2026-06-16 Activity Load More

Render a compact "Load more activity" button when the ready state includes a
`nextCursor`. Keep existing rows visible while loading the next page. If the
next page fails, show a small inline error without replacing the already-loaded
ledger rows.

## Implemented Change 2026-06-16 Activity Load More

Ready state now accepts `nextCursor`, `loadingMore`, and `loadMoreError`.
`AdvertiserActivityFeed` renders a disabled loading button while the next page
is in flight, preserves existing rows, and shows inline load-more errors without
replacing the ledger.

## Planned Change 2026-06-16 Activity Filtering And Export

Add first-pass advertiser ledger controls:

- search by campaign id, activity id, status label, duration label, or amount;
- filter by all activity, billable activity, no-charge activity, and payment
  activity;
- export the currently visible rows as CSV.

Keep this inside the existing feed component and pure helpers so the behavior is
testable without new API work.

## Implemented Change 2026-06-16 Activity Filtering And Export

The feed now includes:

- `filterAdvertiserActivityRows()` for category + normalized text search;
- `advertiserActivityRowsToCsv()` for stable CSV export;
- client controls for search, all/billable/no-charge/payment filters, and CSV
  download of currently visible rows.

Search normalizes punctuation and underscores, so human queries such as
`no charge` can match ids like `cmp_no_charge`.

## Planned Change 2026-06-16 Expandable Activity Details

Render compact per-row details using the shared activity detail helper. Each
row should expose enough audit information for an advertiser to understand what
happened: activity id, campaign id, status, event/duration, amount, created
timestamp, and Stripe checkout/provider ids when present. Keep this as an
inline `details` disclosure so the existing compact feed remains scan-friendly.

## Implemented Change 2026-06-16 Expandable Activity Details

Each advertiser activity row now includes an inline `Details` disclosure using
`activityDetailItems(activity, { amountLabel: "Amount" })`. The compact row
summary remains unchanged, while expanded rows expose activity id, campaign id,
status, event/duration, amount, created timestamp, and Stripe trace ids when
available.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts src/app/dashboard/advertiser/advertiser-activity-feed.test.tsx src/app/dashboard/advertiser/advertiser-dashboard.test.tsx src/app/dashboard/developer/developer-dashboard-parts.test.tsx` passed on 2026-06-15.
- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/advertiser/advertiser-dashboard-context.test.ts src/app/dashboard/advertiser/advertiser-activity-feed.test.tsx` passed on 2026-06-16.
- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/advertiser/advertiser-activity-feed.test.tsx` passed on 2026-06-16 after activity filter/export implementation.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed on 2026-06-16.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented expandable advertiser activity ledger details. | Codex |
| 2026-06-16 | Planned expandable advertiser activity ledger details. | Codex |
| 2026-06-16 | Implemented advertiser activity search/filter/export controls. | Codex |
| 2026-06-16 | Planned advertiser activity search/filter/export controls. | Codex |
| 2026-06-16 | Implemented advertiser activity load-more UI. | Codex |
| 2026-06-16 | Planned advertiser activity load-more UI. | Codex |
| 2026-06-15 | Confirmed advertiser feed rendering works for money event rows via normalized helpers. | Codex |
| 2026-06-15 | Planned advertiser feed rendering for money events. | Codex |
| 2026-06-15 | Created doc before adding advertiser activity feed component. | Codex |
| 2026-06-15 | Synced implemented advertiser activity feed after green tests. | Codex |
