# advertiser-dashboard.tsx

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Client-side advertiser dashboard shell.

## What It Does

- Loads advertiser campaigns from `/api/campaigns`.
- Wires campaign creation into the campaign list.
- Renders loading, error, and ready states.
- Hero header with subtitle and 3-second viewability badge.
- Summary stats (campaign count, total budget) when campaigns exist.
- Two-column layout: campaign builder + campaign list on large screens.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `AdvertiserDashboard` | React component | Advertiser dashboard UI. |

## Dependencies

- Internal: campaign builder/list components, advertiser shell styles.
- External: React hooks.

## Important Notes / NEVER Change

- Keep authenticated API calls using the provided bearer token.
- Do not remove loading/error states.

## Implemented Change (2026-06-14)

- Amber-accent advertiser theme with hero banner, stats row, and two-column layout.
- `AdvertiserDashboardShell` with sticky top bar and `DashboardRoleSwitcher`.
- Campaign builder grouped into Ad copy / Brand / Bidding sections.
- Campaign cards with status badges and improved fund controls.
- Developer dashboard also shows role switcher top-right.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created doc before adding advertiser dashboard viewability copy. | Codex |
| 2026-06-13 | Synced docs with advertiser dashboard viewability copy. | Codex |
| 2026-06-14 | UI refresh: shell, hero, grid layout, role switcher. | Codex |
