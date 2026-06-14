# layout.tsx

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose
Defines the root HTML shell, global CSS imports, metadata, and app-wide body classes for the Next.js web app.

## What It Does

- Imports global theme styles.
- Exports application metadata.
- Renders the root `<html>` and `<body>` wrapper around all pages.
- Applies the default light theme and app-wide typography/background classes.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `metadata` | `Metadata` | Next.js metadata for the app. |
| `RootLayout` | React server component | Wraps all route content. |

## Props / Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `ReactNode` | Yes | Route segment content rendered inside the layout body. |

## Dependencies

- **Internal:** `./globals.css` - Tailwind base tokens and app font variable.
- **Internal:** `./theme.css` - extended design tokens.
- **Internal:** `./home.css` - home page-specific global styling used by the current app.
- **External:** `next` - metadata type.

## Important Notes / NEVER Change

- Do not introduce build-time network dependencies from this layout; production builds must work in CI/offline environments.
- Keep the `light` class unless the app's default theme is intentionally changed.
- Keep global CSS imports centralized here so App Router routes inherit the same theme.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-14 | Production build failed while fetching Nunito from Google Fonts. | `next/font/google` requires a network fetch at build time. | Remove the Google font import and rely on the local CSS font variable. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Created documentation and recorded build-time font fetch fix. | Codex |
