# SpinShareWordmark

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Reusable two-tone "SpinShare" wordmark text that mirrors the infinity icon colors: lime green for "Spin", silver gray for "Share".

## What It Does

- Renders `<span>Spin</span><span>Share</span>` with brand wordmark colors from CSS variables.
- Accepts optional `className` for size/weight overrides (e.g. `text-xl` in nav headers).

## Public API

| Name | Type | Description |
|------|------|-------------|
| `SpinShareWordmark` | React component | Branded wordmark next to the logo icon |

## Props / Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `className` | `string` | No | Extra classes on the outer span (font size, truncation, etc.) |

## Dependencies

- Internal: `@/lib/utils` (`cn`), `web/src/app/theme.css` (`--brand-wordmark-spin`, `--brand-wordmark-share`).
- External: none.

## Important Notes / NEVER Change

- Parent links should keep `aria-label="SpinShare home"` for accessibility; the split colors are visual only.
- Use only in logo lockups (icon + wordmark), not in body copy or legal text.

## Planned Change

- Add `SpinShareWordmark` component.
- Add `--brand-wordmark-spin` and `--brand-wordmark-share` to `theme.css`.
- Replace plain `SpinShare` spans in nav/footer headers across public pages.

## Planned Fix: Vertical Bevel Gradients

Per-word **top-to-bottom** gradients (3 stops each) to mimic icon 3D lighting. Avoid horizontal multi-stop gradients — they render as vertical stripes inside glyphs.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Fixed broken wordmark: vertical bevel per word, removed horizontal shine band | Cursor |
| 2026-06-14 | Switched to static per-word gradients; removed silver sweep animation | Cursor |
| 2026-06-14 | Created before implementing two-tone wordmark styling | Cursor |
