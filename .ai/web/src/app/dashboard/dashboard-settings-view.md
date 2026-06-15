# dashboard-settings-view.tsx

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Shared settings page content for developer and advertiser dashboards. Theme and locale use global providers so changes sync when switching roles.

## What It Does

- Theme picker (auto / light / dark) via `useTheme`.
- Language switcher via `LanguageSwitcher`.
- Account credentials from NextAuth session.
- App version and sign-out button.
- `variant` prop switches accent styling: emerald (developer) or amber (advertiser).

## Public API

| Name | Type | Description |
|------|------|-------------|
| `DashboardSettingsView` | React component | Shared settings panel. |

## Props

| Name | Type | Required | Description |
|------|------|----------|-------------|
| variant | `"developer" \| "advertiser"` | Yes | Accent color theme for the panel. |

## Dependencies

- `useTheme`, `LanguageSwitcher`, `next-auth/react`, `developerDashboard` i18n (shared labels).

## Layout

- Settings panel fills the dashboard main column (`width: 100%` on `.dev-dash-main-inner` / `.adv-dash-main-inner`).
- Two-column grid from `md` breakpoint: theme + language on top row, account spans full width, version + logout on bottom row.
- No `max-w-md` caps on inner controls — form fields use available panel width.

## Bug Fix (2026-06-14)

**Symptom:** Settings card rendered ~28rem wide and centered with huge empty margins.

**Cause:** `margin: 0 auto` on flex children (`main-inner`) prevents cross-axis stretch, so the main column shrank to the widest `sm:max-w-md` child.

**Fix:** Add `width: 100%` to dashboard `main-inner` CSS; remove `sm:max-w-md` from settings controls; use responsive grid layout.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Fix narrow settings container; full-width responsive grid layout. | Codex |
| 2026-06-14 | Extracted from developer-only settings for cross-role sync. | Codex |
