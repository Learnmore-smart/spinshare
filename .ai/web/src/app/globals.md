# globals.css

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose
Defines Tailwind layers, core semantic theme tokens, and global element styles for the web app.

## What It Does

- Loads Tailwind base, component, and utility layers.
- Defines Shadcn-style HSL design tokens consumed by Tailwind.
- Provides light and dark theme token sets.
- Applies global border, background, text, and font behavior.

## Public API

| Name | Type | Description |
|------|------|-------------|
| CSS custom properties | Theme tokens | Shared variables for colors, radius, and typography. |
| Global element styles | CSS rules | App-wide base styles for body and form controls. |

## Props / Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| N/A | N/A | N/A | This stylesheet has no runtime parameters. |

## Dependencies

- **External:** `tailwindcss` - consumes the layer directives and CSS variables through generated utility classes.
- **Internal:** `web/tailwind.config.ts` - reads `--font-nunito` for the `font-sans` utility.

## Important Notes / NEVER Change

- Keep `--font-nunito` defined locally; it is the typography contract used by Tailwind and body styles.
- Do not depend on external font downloads for production builds.
- Keep token names compatible with `tailwind.config.ts`.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-14 | Production build failed when Google Fonts could not be fetched. | The font variable was only provided by `next/font/google`. | Define `--font-nunito` as a local system font stack in CSS. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Created documentation and planned local font variable fallback. | Codex |
