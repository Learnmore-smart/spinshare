# SegmentSlider.tsx

> Protection: STANDARD

## Purpose

Reusable sliding segment control (thumb animates between options). Extracted from the sign-in role picker; used on sign-in, developer dashboard chart range, setup guide modal.

## CSS

Styles live in `web/src/components/segment-slider.css`, imported globally from `layout.tsx`. Colors use `theme.css` tokens (`--surface-segment-*`, `--text-segment*`).

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Dark mode via theme.css segment tokens | Cursor |
| 2026-06-14 | Extracted from sign-in; shared across web | Cursor |
