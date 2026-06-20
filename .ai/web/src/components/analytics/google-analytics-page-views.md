# google-analytics-page-views.tsx

> Last updated: 2026-06-20 | Protection: STANDARD

## Purpose
Fires GA4 pageview updates on App Router client navigations (after the initial load handled by `google-analytics.tsx`).

## What It Does

- Subscribes to `usePathname` and `useSearchParams`.
- On change, calls `gtag('config', measurementId, { page_path })` when gtag is loaded.
- Renders nothing; must be mounted inside `<Suspense>` in `layout.tsx`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Created for SPA route-change pageview tracking. | Cursor |
