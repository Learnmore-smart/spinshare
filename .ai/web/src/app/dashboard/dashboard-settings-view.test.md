# dashboard-settings-view.test.tsx

> Last updated: 2026-06-19 | Protection: STANDARD

## Purpose

Static render regression tests for the shared dashboard settings panel.

## What It Does

- Renders `DashboardSettingsView` with mocked NextAuth session data and real locale/theme providers.
- Verifies the settings page exposes support contact information.
- Verifies the language switcher cell has an explicit foreground layer so its dropdown can paint above later settings rows.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `DashboardSettingsView` tests | Vitest suite | Guards settings panel markup contracts. |

## Dependencies

- Internal: `DashboardSettingsView`, `LocaleProvider`, `ThemeProvider`.
- External: Vitest, React static renderer.

## Agent Decisions / Thoughts

- **2026-06-19 Codex:** Use static render coverage because the existing web test setup runs in Node, not jsdom. The bug is a markup/CSS layering contract, so checking the foreground class and support `mailto:` link catches the intended regression without adding browser test infrastructure.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Created planned regression test doc for settings dropdown layering and support email. | Codex |

## Implemented Coverage 2026-06-19

Added static-render coverage that asserts:
- `mailto:support@learnx.pro` and the support email text render in settings.
- The language settings section includes `data-settings-language="true"` and
  `relative z-20` foreground layering.

## Verification 2026-06-19

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/dashboard-settings-view.test.tsx` passed.
