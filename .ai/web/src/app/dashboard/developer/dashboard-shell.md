# dashboard-shell.tsx

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Fixed icon rail for the developer dashboard. No collapse — always icon-only.

## Layout

- **Desktop:** 4rem left rail — logo (top), nav icons (middle), settings (bottom).
- **Mobile:** fixed bottom bar — 4 equal nav icons (overview, earnings, activity, settings); logo hidden; solid white/dark background.

## Nav routes

| Icon | Route | Page |
|------|-------|------|
| LayoutDashboard | `/dashboard/developer` | Overview |
| LineChart | `/dashboard/developer/earnings` | Earnings chart |
| ScrollText | `/dashboard/developer/activity` | Activity ledger |
| Settings | `/dashboard/developer/settings` | Settings page |

## Dependencies

- `developer-settings-view.tsx`, `next/navigation` (`usePathname`)
- Styles: `developer-dashboard.css` (`.dev-dash-rail*`)
