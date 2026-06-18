# advertiser-dashboard-context.tsx

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Client context for advertiser dashboard data loading and shared dashboard
actions.

## What It Does

- Stores campaign load state from `/api/campaigns`.
- Stores advertiser activity load state from `/api/activity/advertiser`.
- Provides reload callbacks to overview/activity child views.
- Normalizes activity API rows through `toActivityFeedRows()`.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `AdvertiserDashboardProviderClient` | React provider | Loads dashboard data and exposes context |
| `useAdvertiserDashboard` | hook | Reads dashboard context |
| `LoadState` | type | Campaign loading state |

## Dependencies

- Internal: `activity-feed.ts`, advertiser dashboard `lib`.
- External: React context/state/effect hooks.

## Important Notes / NEVER Change

- Keep authenticated API calls using the provided bearer token.
- Activity loading must not block campaign management.
- Preserve already-loaded activity rows when loading additional pages fails.

## Implemented Change 2026-06-16

Advertiser activity API pagination is wired into the dashboard:

- captures `nextCursor` from `/api/activity/advertiser`;
- exposes `loadMoreActivity()`;
- appends de-duplicated rows when the user requests more;
- keep existing rows visible while a later page is loading or fails.

`mergeActivityRows()` is exported as a pure helper for focused unit coverage.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented advertiser activity load-more wiring and merge helper. | Codex |
| 2026-06-16 | Created doc and planned advertiser activity load-more wiring. | Codex |
