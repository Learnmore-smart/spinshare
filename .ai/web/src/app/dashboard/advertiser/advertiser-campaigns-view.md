# advertiser-campaigns-view.tsx

> Last updated: 2026-06-18 | Protection: STANDARD

## Purpose

Renders the advertiser campaigns page, including loading/error states and the
campaign list once dashboard data is ready.

## What It Does

- Reads campaign state and actions from the advertiser dashboard context.
- Focuses a campaign funding control when the page is opened with `?fund=...`.
- Shows loading skeletons, error retry UI, or the real campaign list.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `AdvertiserCampaignsView` | React component | Campaigns dashboard page body |

## Dependencies

- Internal: advertiser dashboard context, `CampaignList`, shared UI card/button components.
- External: React `useEffect`.

## Planned Change 2026-06-18 Delete Unpaid Campaign

Pass the dashboard context's `deleteCampaign` action into `CampaignList` so the
unpaid campaign cancel button can permanently remove the campaign from storage
and from local state.

## Implemented Change 2026-06-18 Delete Unpaid Campaign

`AdvertiserCampaignsView` now reads `deleteCampaign` from the dashboard context
and passes it to `CampaignList` with the loaded campaigns.

## Important Notes / NEVER Change

- Keep the `?fund=` resume behavior so cancelled checkout links still focus the
  correct campaign's buy control.
- Keep loading and error states independent from the list rendering.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Implemented passing delete action to campaign list. | Codex |
| 2026-06-18 | Created doc and planned passing delete action to campaign list. | Codex |
