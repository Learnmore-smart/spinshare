# developer-dashboard.css

> Last updated: 2026-06-19 | Protection: STANDARD

## Purpose

Developer dashboard layout and surface styling.

## What It Does

- Defines the developer dashboard shell, rail navigation, scrollable main area, panels, stats, hero card, and activity cards.
- Supplies emerald-themed CSS variables and responsive mobile rail behavior.
- Shares panel semantics with advertiser dashboard where appropriate.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `.dev-dash-panel` | CSS class | Main reusable developer dashboard panel surface. |
| `.dev-dash-main-inner` | CSS class | Centered dashboard content column. |

## Dependencies

- Internal: `DashboardSettingsView`, developer dashboard pages, `TiltCard`.
- External: None.

## Important Notes / NEVER Change

- Settings and other interactive controls can render absolute-positioned popovers inside `.dev-dash-panel`; keep panel overflow visible unless a specific card opts into clipping.

## Planned Change 2026-06-19 Language Dropdown

Add `overflow: visible` to `.dev-dash-panel` so settings language dropdowns are not clipped by the panel. This matches the advertiser panel, which already declares visible overflow for popover-safe surfaces.

## Implemented Change 2026-06-19 Language Dropdown

Added `overflow: visible` to `.dev-dash-panel`.

## Verification 2026-06-19

- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Implemented visible overflow for developer panels. | Codex |
| 2026-06-19 | Created doc and planned visible overflow for developer panels. | Codex |
