# google-analytics.tsx

> Last updated: 2026-06-20 | Protection: STANDARD

## Purpose
Loads Google Analytics 4 (gtag.js) site-wide when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set.

## What It Does

- Injects the official `gtag.js` loader and inline config snippet via `next/script`.
- Renders nothing when the measurement ID env var is missing (local dev without analytics).
- Uses `afterInteractive` so analytics does not block first paint.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `GoogleAnalytics` | React client component | Conditionally loads GA4 for the configured measurement ID. |

## Dependencies

- **External:** `next/script` — deferred script loading.
- **Env:** `NEXT_PUBLIC_GA_MEASUREMENT_ID` — GA4 measurement ID (e.g. `G-XXXXXXXXXX`).

## Important Notes / NEVER Change

- Do not hardcode measurement IDs in source; read from `NEXT_PUBLIC_GA_MEASUREMENT_ID` only.
- Mount once from `layout.tsx` `<head>` so every page gets a single tag.
- Measurement IDs are public; still keep them in env for per-environment control.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Added GA4 component for SpinShare production analytics. | Cursor |
