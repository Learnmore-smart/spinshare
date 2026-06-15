# DashboardRoleSwitcher.tsx

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Segmented slider in dashboard top bars so users can switch between developer and advertiser dashboards.

## What It Does

- Renders `SegmentSlider` with Developer | Advertiser options and sliding thumb.
- Derives active role from `usePathname()`; on change, updates optimistic local state so the thumb slides, then navigates after the 240ms CSS transition (developer/advertiser layouts remount on route change).
- Icons: Code2 (developer), Layers (advertiser).

## Public API

| Name | Type | Description |
|------|------|-------------|
| `DashboardRoleSwitcher` | React component | Role slider for dashboard headers. |

## Dependencies

- `SegmentSlider`, `next/navigation`, `lucide-react`, `useT`, `dashboardCommon` i18n keys.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Created before advertiser dashboard UI refresh. | Codex |
| 2026-06-14 | Replaced link buttons with `SegmentSlider` sliding control. | Codex |
