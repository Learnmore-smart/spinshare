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

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created doc before adding advertiser dashboard viewability copy. | Codex |
