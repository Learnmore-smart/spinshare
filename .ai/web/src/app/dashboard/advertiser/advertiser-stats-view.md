# advertiser-stats-view.tsx

> Last updated: 2026-06-18 | Protection: STANDARD

## Purpose

Renders the advertiser campaign stats page.

## What It Does

- Shows aggregate spend, delivered impressions, raw shows, clicks, and CTR.
- Uses fractional spend helpers so sub-cent CPM spend renders with three
  decimal places.
- Lists per-campaign stats with the same derived status labels as the campaigns
  page.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `AdvertiserStatsView` | React component | Stats page body for `/dashboard/advertiser/stats`. |

## Dependencies

- Internal: advertiser dashboard context, i18n, and pure dashboard helpers.
- External: `lucide-react` icons and `TiltCard`.

## Important Notes / NEVER Change

- Do not round ad spend to whole cents; use three-decimal USD display.
- Status labels must come from `displayStatus()` rather than stored
  `Campaign.status`.

## Planned Change 2026-06-18 Needs-Link Status

Add a status label mapping for `needsLink` so paid campaigns without a valid
destination are not shown as active in the stats table.

## Implemented Change 2026-06-18 Needs-Link Status

The stats page status label map includes `needsLink`, keeping per-campaign
breakdown rows aligned with the campaigns page and server biddability rule.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Implemented needs-link status mapping. | Codex |
| 2026-06-18 | Created doc and planned needs-link status mapping. | Codex |
