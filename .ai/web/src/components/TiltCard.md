# TiltCard

> Last updated: 2026-06-18 | Protection: STANDARD

## Purpose

Reusable interactive 3D "tilt" surface that brings the marketing home page's
liquid-glass parallax treatment to the dashboards. On hover the card tilts toward
the cursor (perspective + `rotateX`/`rotateY`), a soft radial "glare" tracks the
pointer, and opted-in children lift toward the viewer via `translateZ`.

## What It Does

- Tracks the pointer on `mousemove` and applies an inline `perspective(1100px)
  rotateX() rotateY() scale3d()` transform plus a `transform-style: preserve-3d`
  context.
- Keeps hover chrome smooth by including `box-shadow`, border, and background
  transitions in the inline `transition` value. This is required because inline
  transitions override the dashboard card classes' CSS transitions.
- Renders a `tilt-card-glare` overlay whose radial-gradient position follows the
  cursor; fades out on mouse leave.
- Children with class `tilt-pop` / `tilt-pop-sm` (styled in `home.css`) rise via
  `translateZ` while the card is hovered — only works on cards WITHOUT
  `overflow: hidden` (overflow clipping flattens `preserve-3d`).
- Suppresses the effect entirely for coarse pointers (touch) and when
  `prefers-reduced-motion: reduce` is set — the handler early-returns so the card
  stays flat and only the CSS hover treatment (lift + shadow) applies.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `TiltCard` | React client component | Pointer-tracked 3D tilt container |

## Props / Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `children` | `ReactNode` | Yes | — | Card contents |
| `className` | `string` | No | `""` | Extra classes (e.g. `dev-dash-hero`, `adv-dash-stat`) — merged after `tilt-card group` |
| `intensity` | `number` | No | `12` | Max tilt angle (deg) at the card edges |
| `scale` | `number` | No | `1.015` | Scale applied while hovered |
| `glow` | `string` | No | `"16, 185, 129"` | RGB triplet (no wrapper) for the glare — emerald default; pass `"245, 158, 11"` for the amber advertiser theme |
| `glareRadius` | `number` | No | `320` | Radius (px) of the glare circle |
| `style` | `CSSProperties` | No | — | Extra inline styles merged after the computed transform |
| ...rest | `HTMLAttributes<div>` | No | — | Passes through `data-testid`, `role`, etc. |

## Dependencies

- Internal: shared `.tilt-card` / `.tilt-card-glare` / `.tilt-pop(-sm)` styles and the
  global `prefers-reduced-motion` guard live in `web/src/app/home.css` (loaded
  app-wide via `layout.tsx`).
- External: React only.

## Important Notes / NEVER Change

- `window.matchMedia` is referenced ONLY inside the `mousemove` handler — never at
  module or render scope — so the component stays SSR-safe under
  `renderToStaticMarkup` (see `advertiser-dashboard.test.tsx`).
- Keep the coarse-pointer AND reduced-motion early-returns; they are the
  accessibility guarantee.
- Keep the non-transform transition terms in the inline style. Without them,
  dashboard hover shadows snap because the inline transform transition replaces
  the card classes' CSS `transition` declarations.
- When wrapping a hero with `overflow: hidden`, do not expect `tilt-pop` children to
  pop (preserve-3d is flattened) — use it only on `overflow: visible` cards (stats).

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Implemented persistent transform plus box-shadow/background/border transition string so dashboard hover shadows ease instead of snapping | Codex |
| 2026-06-18 | Planned smooth dashboard shadow transitions by adding box-shadow/background/border transition terms to TiltCard's inline style | Codex |
| 2026-06-18 | Created: generalized the marketing ThreeDCard/HeroDashboardCard tilt into a shared component used by the developer + advertiser dashboard heroes and stat cards | Claude |
