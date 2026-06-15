# dashboard-shell.tsx

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Fixed icon rail for the developer dashboard. No collapse — always icon-only.

## Layout

- **Desktop:** 4rem left rail — logo (top), nav icons (middle), settings (bottom).
- **Mobile:** fixed bottom bar — 4 equal nav icons (overview, earnings, activity, settings); logo hidden; compact height with rounded icon buttons centered in each slot (not full-height rectangles).

## Mobile bottom bar (2026-06-14)

Compact bar: `3.25rem` total height, `0.375rem` vertical padding, `2.5rem` rounded icon buttons (`border-radius: 0.75rem`) centered per tab. Safe-area inset added below.

## Bug fix (2026-06-14): settings icon flush to rail bottom

**Symptom:** On desktop, the settings icon sat flush against the bottom edge of the rail (no bottom padding), unlike the logo area at the top.

**Cause:** Settings lived inside `.dev-dash-rail-nav` with `margin-top: auto`, so it pinned to the nav flex box bottom while the nav only had `0.5rem` vertical padding. The unused `.dev-dash-rail-bottom` wrapper (with `0.75rem` padding) was never wired up.

**Fix:** Move settings link into `.dev-dash-rail-bottom`; use `margin-top: auto` on that section so it anchors to the rail bottom with matching padding and a top border. On mobile, `.dev-dash-rail-bottom` becomes a fourth equal tab alongside the three nav icons.

## Nav routes

| Icon | Route | Page |
|------|-------|------|
| LayoutDashboard | `/dashboard/developer` | Overview |
| LineChart | `/dashboard/developer/earnings` | Earnings chart |
| ScrollText | `/dashboard/developer/activity` | Activity ledger |
| Settings | `/dashboard/developer/settings` | Settings page |

## Implemented Change (2026-06-14)

Sticky top bar inside `.dev-dash-main` with `DashboardRoleSwitcher` aligned top-right.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Added role switcher to developer main top bar. | Codex |
