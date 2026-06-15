# SegmentSlider.tsx

> Protection: STANDARD

## Purpose

Reusable sliding segment control (thumb animates between options). Extracted from the sign-in role picker; used on sign-in, developer dashboard chart range, setup guide modal.

## CSS

Styles live in `web/src/components/segment-slider.css`, imported globally from `layout.tsx`. Colors use `theme.css` tokens (`--surface-segment-*`, `--text-segment*`).

## Public API

| Name | Type | Description |
|------|------|-------------|
| SegmentSlider | Component | Sliding thumb segment control |
| compact | prop | Slightly smaller segments (dashboard charts) |
| mini | prop | Extra-small segments for dense headers (homepage bid chart) |

## Planned Change (2026-06-14)

Add `mini` size modifier for 2-option controls in tight header rows (homepage bid-market 24H/ALL).

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Add `mini` prop and `--mini` CSS modifier | Cursor |
| 2026-06-14 | Extracted from sign-in; shared across web | Cursor |
