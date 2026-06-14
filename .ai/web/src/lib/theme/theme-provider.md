# theme-provider.tsx

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Client theme preference: `auto` | `light` | `dark`. Persists to `localStorage` key `spinshare.theme` and toggles `light`/`dark` on `<html>`.

## Notes

- `theme-script.tsx` runs before paint to avoid flash.
- `auto` follows `prefers-color-scheme` and listens for changes.
- Default preference is `auto`; only explicit `light`/`dark` choices are persisted to `localStorage`. Choosing `auto` removes the storage key so the browser preference wins.

## Planned Change (2026-06-14)

- Persist theme only when user picks `light` or `dark`; `auto` clears `spinshare.theme` from storage.
- Initialize `resolved` from `<html>` class (set by ThemeScript) to avoid a light flash before hydration.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Auto default: no localStorage write for auto; sync resolved from DOM | Cursor |
