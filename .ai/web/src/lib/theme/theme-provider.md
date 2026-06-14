# theme-provider.tsx

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Client theme preference: `auto` | `light` | `dark`. Persists to `localStorage` key `spinshare.theme` and toggles `light`/`dark` on `<html>`.

## Notes

- `theme-script.tsx` runs before paint to avoid flash.
- `auto` follows `prefers-color-scheme` and listens for changes.
