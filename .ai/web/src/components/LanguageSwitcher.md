# LanguageSwitcher

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose
Pill-shaped language switcher with globe icon. Opens a dropdown with **Auto** (browser-detected) plus explicit locale choices (en, zh, fr).

## What It Does
- First row: **Auto** — follows browser language via `LocaleProvider` preference
- Remaining rows: explicit locale picks (persisted to localStorage + cookie)
- Pill label shows "Auto" when preference is auto, otherwise the active locale native name
- `variant="list"`: same options in always-visible vertical list
- Smooth enter/exit animation via `language-switcher.css`

## Dependencies
- `@/lib/i18n/locale-provider` (`useLocale`, `useLocalePreference`, `useSetLocalePreference`)
- `@/lib/i18n/types`
- `./language-switcher.css`

## Change History
| Date | Change |
|------|--------|
| 2026-06-14 | Auto option at top; removed header hint text |
| 2026-06-14 | Smooth enter/exit dropdown animation |
