# SpinShareWordmark

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Reusable "SpinShare" wordmark text rendered in solid black (`#000000`) beside the logo icon.

## What It Does

- Renders `SpinShare` as a single black text span (`text-black`).
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

- Internal: `@/lib/utils` (`cn`).
- External: none.

## Important Notes / NEVER Change

- Parent links should keep `aria-label="SpinShare home"` for accessibility.
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
| 2026-06-14 | Switched wordmark to solid black text (removed green/silver gradients) | Cursor |
| 2026-06-14 | Fixed broken wordmark: vertical bevel per word, removed horizontal shine band | Cursor |
| 2026-06-14 | Switched to static per-word gradients; removed silver sweep animation | Cursor |
| 2026-06-14 | Created before implementing two-tone wordmark styling | Cursor |
