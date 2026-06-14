# dashboard-settings → settings page

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Settings is a full page at `/dashboard/developer/settings` (theme, language, account, version, sign out). The right-side modal (`DashboardSettingsPanel`) was removed.

## Route

- `settings/page.tsx` → `DeveloperSettingsView`
- Rail settings icon links here with active state

## Data

Uses `useDeveloperDashboard()` for user email/id.
