# developer-dashboard-parts.tsx

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Shared developer dashboard presentation components.

## Planned Change

Update `ActivityList` and `ActivityTable` to render attempt-level activity feed
rows, including status and duration, while preserving existing earnings widgets.

## Implemented Change

`ActivityList` and `ActivityTable` now render `ActivityFeedRow` records keyed by
`activityId`. Rows show campaign id, attempt status, duration, and credit label;
credited rows use earning colors while non-credited attempts stay muted.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts src/app/dashboard/advertiser/advertiser-activity-feed.test.tsx src/app/dashboard/advertiser/advertiser-dashboard.test.tsx src/app/dashboard/developer/developer-dashboard-parts.test.tsx` passed on 2026-06-15.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Created doc before updating developer activity presentation rows. | Codex |
| 2026-06-15 | Synced implemented attempt-level activity presentation rows. | Codex |
