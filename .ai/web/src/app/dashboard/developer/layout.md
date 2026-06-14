# layout.tsx

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Shared developer dashboard layout: auth gate, ledger fetch, `DeveloperDashboardProvider`, `DashboardShell`.

## Child routes

- `page.tsx` — overview (balance, stats, caps, payout)
- `earnings/page.tsx` — earnings chart
- `activity/page.tsx` — activity table
- `settings/page.tsx` — theme, locale, account, sign out

## Error handling

Ledger load failure renders `DeveloperDashboardError` (no provider/shell children).
