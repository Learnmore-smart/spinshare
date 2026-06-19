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

## Planned Change 2026-06-19 Language Dropdown + Support Email

**Bug:** In the dashboard settings card, the language dropdown can be hidden or visually trapped under later settings rows/tilt-card chrome.

**Root Cause Hypothesis:** The settings card is rendered inside `TiltCard`, which creates a transformed 3D stacking context. The language menu is absolutely positioned from an early grid cell, so it needs an explicit foreground layer in the settings grid and the developer panel must allow overflow, matching the advertiser panel.

**Fix Strategy:**
- Give the settings language section an explicit relative z-index so its dropdown paints above later account/version rows.
- Keep the dropdown implementation unchanged because nav/footer usage already depends on it.
- Add `support@learnx.pro` as a visible `mailto:` support contact in the account details block.

**Regression Coverage:** Add a static render test for `DashboardSettingsView` proving the support mail link is present and the language section carries the foreground layering class.

## Change History Addendum

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Planned settings language dropdown layering fix and support email contact. | Codex |

## Implemented Change 2026-06-19 Language Dropdown + Support Email

Implemented the settings-layer fix by giving the language section `relative z-20`
plus a `data-settings-language` marker for regression coverage. Added
`support@learnx.pro` as a `mailto:` link in the account details grid, using a
localized `developerDashboard.support` label.

## Verification 2026-06-19

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/dashboard-settings-view.test.tsx` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History Addendum 2

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Implemented settings language dropdown layering fix and support email contact. | Codex |
