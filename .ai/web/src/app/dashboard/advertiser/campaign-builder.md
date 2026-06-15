# campaign-builder.tsx

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Advertiser dashboard form for creating campaigns.

## Planned Change (2026-06-14)

- Remove redundant section headers (`sectionAdCopy`, `sectionBrand`, `sectionBidding`) — field labels already identify each group.
- Fix submit button box-shadow: drop default green `shadow-neon`; use amber elevation shadow via `.adv-dash-submit-btn` so the glow is not clipped at the panel bottom.

## Planned Change

When a brand icon is uploaded, preview the image at a fixed size inside the file-picker row (replacing the generic icon) without resizing the container.

## Planned Change

CPM bid input minimum is $1.00 (matches `CPM_CENTS_MIN`).

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | CPM minimum raised to $1.00 in form + hints. | Codex |
| 2026-06-14 | Brand icon preview in fixed-size slot. | Codex |
