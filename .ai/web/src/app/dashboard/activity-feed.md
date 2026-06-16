# activity-feed.ts

> Last updated: 2026-06-15 | Protection: STANDARD

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

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts src/app/dashboard/advertiser/advertiser-activity-feed.test.tsx src/app/dashboard/advertiser/advertiser-dashboard.test.tsx src/app/dashboard/developer/developer-dashboard-parts.test.tsx` passed on 2026-06-15.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented activity feed support for advertiser money events. | Codex |
| 2026-06-15 | Planned activity feed support for advertiser money events. | Codex |
| 2026-06-15 | Created doc before adding shared activity feed helpers. | Codex |
| 2026-06-15 | Synced implemented activity feed helper behavior after green tests. | Codex |
