# advertiser-dashboard-shell.tsx

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Layout shell for the advertiser dashboard: icon rail sidebar (mirrors developer shell), top bar with role slider, main content area.

## What It Does

- Wraps advertiser dashboard pages in `.adv-dash` theme.
- **Desktop:** 4rem left rail — logo (top), overview nav (middle), settings (bottom).
- **Mobile:** fixed bottom bar — overview + settings icons.
- Top bar: role switcher (`DashboardRoleSwitcher`) aligned right.
- Settings link → `/dashboard/advertiser/settings` (theme/locale sync via global providers).

## Dependencies

- `DashboardRoleSwitcher`, `advertiser-dashboard.css`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Created for advertiser dashboard UI refresh. | Codex |
| 2026-06-14 | Replaced header-only layout with icon rail + settings (parity with developer). | Codex |
