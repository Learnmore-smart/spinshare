# home.css

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Homepage-specific layout, glass surfaces, CTA styles, and hero highlight animations.

## Planned Change (2026-06-15)

Add layout-only CSS hooks for the friend-reference homepage structure:

- A centered page frame with max-width and vertical rhythm.
- Desktop split hero columns and mobile stacking.
- Framed process panel for the before/after wait-state comparison.
- Two-column market proof grid with responsive collapse.
- Compact proof-card row spacing and stable, non-overlapping mockup card sizes.

These styles should preserve the existing SpinShare theme variables and avoid
copying the screenshot's color palette or exact UI treatment.

## Implemented Change (2026-06-15)

- Added `.spinshare-home-frame`, `.spinshare-frame-section`,
  `.spinshare-hero-layout`, `.spinshare-process-panel`,
  `.spinshare-hero-proof-rail`, `.spinshare-market-proof-grid`, and
  `.spinshare-proof-card-row`.
- Added responsive desktop grid rules for the split hero and two-column market
  proof area.
- Preserved theme variables and existing glass/button styling instead of copying
  the friend's colors or UI chrome.

## Bug Fix (2026-06-15)

**Bug:** A narrow vertical scrollbar appears inside the first hero viewport near
the right edge of the centered page frame.

**Cause:** `.spinshare-home-hero` sets `overflow-x: hidden`; Chromium computes
the other axis as scrollable (`overflow-y: auto`) when the hero has vertical
decorative/content overflow, creating an inner scroll container.

**Fix:** Remove the hero-level `overflow-x: hidden`. Global/page-level
horizontal overflow guards remain on `html`, `body`, and `.spinshare-home`, so
the decorative blobs still cannot create page-wide horizontal scrolling.

**Implemented:** Removed `overflow-x: hidden` from `.spinshare-home-hero`.

**Verification:** A Playwright red check first reproduced the bug with
`overflowY=auto` on `.spinshare-home-hero`; after the CSS change the same check
reported `overflowX=visible`, `overflowY=visible`, and no local vertical scroll
containers except the document root. `corepack pnpm@9.12.0 --filter
@spinshare/web test -- src/app/page.test.tsx` passed, and `corepack
pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Planned Change 2026-06-17: Market Proof Row Layout

The market section currently defines `spinshare-market-proof-grid`, but the
homepage no longer uses it around the live market and advertiser checkout form.
Restore that grid so desktop reads as a horizontal row: live market module on
the wider left column, advertiser checkout on the right, and the CTA spanning
both columns below.

## Implemented Change 2026-06-17: Market Proof Row Layout

Desktop `spinshare-market-proof-grid` now gives the live market the wider left
column and the advertiser checkout form a right column. Only the lower CTA spans
the full grid width.

## Bug Fix (2026-06-14)

**Bug:** Hero highlight line (`你拿钱` / `You get`) clips at the top — ascenders and emoji sit flush against a cut edge.

**Cause:** `.spinshare-home-hero` sets `overflow: hidden`, which clips large `text-7xl`/`text-8xl` headline glyphs inside the hero.

**Fix:** Remove `overflow: hidden` from `.spinshare-home-hero`. Decorative blobs remain `absolute` with `pointer-events-none`; slight bleed outside the section is acceptable.

## Planned Change (2026-06-14)

Footer polish:

- Remove `.spinshare-home-footer a:hover` accent color shift — footer links stay muted with no hover state.

## Planned Change (2026-06-14)

Remove hover lift/shadow on `.liquid-glass-black` — used only by the homepage Claude vs SpinShare demo panels; they are display-only, not interactive.

## Planned Change (2026-06-14)

Homepage bid-market timeframe: replace custom `.spinshare-home-timeframe` buttons with shared `SegmentSlider` (`mini` size) for consistent thumb UI at a smaller footprint.

## Planned Change 2026-06-20: Slower Top Marquee

Slow the homepage top ticker banner by increasing `.animate-marquee` duration
from `50s` to `80s` per loop.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Slow marquee animation from 50s to 80s per loop | Cursor |
| 2026-06-17 | Implemented market proof row layout for live market plus checkout form. | Codex |
| 2026-06-17 | Planned market proof row layout for the live market and checkout form. | Codex |
| 2026-06-15 | Removed `.spinshare-home-hero` local overflow rule and verified the inner hero scrollbar is gone | Codex |
| 2026-06-15 | Planned fix for unwanted inner hero scrollbar caused by `overflow-x: hidden` computing `overflow-y: auto` | Codex |
| 2026-06-15 | Added responsive layout hooks for centered spine, split hero, process panel, market grid, and proof cards | Codex |
| 2026-06-15 | Documented layout-only CSS plan for friend-reference homepage structure | Codex |
| 2026-06-14 | Bid-market chart uses `SegmentSlider` mini; remove bespoke timeframe button styles | Cursor |
| 2026-06-14 | Remove footer link hover color | Cursor |
| 2026-06-14 | Remove hero `overflow: hidden` to fix headline clipping | Cursor |
