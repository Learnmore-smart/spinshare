# advertiser-activity-view.tsx

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Small bridge component between advertiser dashboard context and the advertiser
activity feed UI.

## What It Does

- Reads activity state from `useAdvertiserDashboard()`.
- Reads `loadMoreActivity` from `useAdvertiserDashboard()`.
- Renders `AdvertiserActivityFeed` with the load-more handler.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `AdvertiserActivityView` | React component | Dashboard activity panel bridge |

## Dependencies

- Internal: `advertiser-dashboard-context`, `advertiser-activity-feed`.

## Important Notes / NEVER Change

- Keep this component thin; data fetching belongs in dashboard context.

## Implemented Change 2026-06-16

Passes the new `loadMoreActivity` context action into `AdvertiserActivityFeed` so
the activity page can request the next API cursor page.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented load-more handler pass-through. | Codex |
| 2026-06-16 | Created doc and planned load-more handler pass-through. | Codex |
