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

## Planned Change (2026-06-15)

- Summary containers must always render in the ready state, even when every
  value is zero.
- Add aggregate telemetry cards: shows, served/credited impressions, clicks,
  CTR, and non-credit diagnostics.
- Telemetry must be aggregate campaign data only; no prompts, user content, or
  private user identifiers.

## Implemented Change (2026-06-15)

The advertiser dashboard now always renders its summary stat containers and
shows zero values when campaigns or telemetry have not loaded yet. Added
aggregate cards for total shows, served impressions, clicks, CTR, and
uncredited totals.

## Verification (2026-06-15)

- `corepack pnpm@9.12.0 --filter @spinshare/web test` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

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
