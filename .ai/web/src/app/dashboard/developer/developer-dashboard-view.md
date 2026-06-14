# developer-dashboard (split views)

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Developer earnings dashboard split into three routes under a shared layout.

## Files

| File | Route | Content |
|------|-------|---------|
| `developer-overview-view.tsx` | `/dashboard/developer` | Hero balance, stat cards, caps, payout |
| `developer-earnings-view.tsx` | `/dashboard/developer/earnings` | Chart + range slider |
| `developer-activity-view.tsx` | `/dashboard/developer/activity` | Filterable activity ledger |
| `developer-dashboard-parts.tsx` | — | Shared UI + error state |
| `developer-dashboard-data.tsx` | — | React context for summary + user |

## Data flow

`layout.tsx` loads ledger once → `DeveloperDashboardProvider` → page views via `useDeveloperDashboard()`.
