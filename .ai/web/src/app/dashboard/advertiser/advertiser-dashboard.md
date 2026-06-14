# advertiser-dashboard.tsx

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Client-side advertiser dashboard shell.

## What It Does

- Loads advertiser campaigns from `/api/campaigns`.
- Wires campaign creation into the campaign list.
- Renders loading, error, and ready states.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `AdvertiserDashboard` | React component | Advertiser dashboard UI. |

## Dependencies

- Internal: campaign builder/list components and UI primitives.
- External: React hooks.

## Important Notes / NEVER Change

- Keep authenticated API calls using the provided bearer token.
- Do not remove loading/error states.

## Planned Change

Display "3-second minimum views" in the dashboard header so advertisers know
campaign impressions are counted only after the minimum view time.

## Implemented Change

The dashboard header now displays `3-second minimum views` near the campaign
overview text, making the impression counting rule visible to advertisers.

## Verification

- Green: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/track/route.test.ts src/app/page.test.tsx src/app/dashboard/advertiser/advertiser-dashboard.test.tsx` passed.
- Full workspace tests and lint passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created doc before adding advertiser dashboard viewability copy. | Codex |
| 2026-06-13 | Synced docs with advertiser dashboard viewability copy. | Codex |
