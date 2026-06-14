# home.css

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Homepage-specific layout, glass surfaces, CTA styles, and hero highlight animations.

## Bug Fix (2026-06-14)

**Bug:** Hero highlight line (`你拿钱` / `You get`) clips at the top — ascenders and emoji sit flush against a cut edge.

**Cause:** `.spinshare-home-hero` sets `overflow: hidden`, which clips large `text-7xl`/`text-8xl` headline glyphs inside the hero.

**Fix:** Remove `overflow: hidden` from `.spinshare-home-hero`. Decorative blobs remain `absolute` with `pointer-events-none`; slight bleed outside the section is acceptable.

## Planned Change (2026-06-14)

Footer polish:

- Remove `.spinshare-home-footer a:hover` accent color shift — footer links stay muted with no hover state.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Remove footer link hover color | Cursor |
| 2026-06-14 | Remove hero `overflow: hidden` to fix headline clipping | Cursor |
