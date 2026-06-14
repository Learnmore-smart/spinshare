# theme.css

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Shared SpinShare visual theme and decorative animation styles for the web app.

## What It Does

- Defines premium mint/emerald sign-in surfaces.
- Styles shared SpinShare buttons, cards, inputs, and role switcher controls.
- Provides ambient background animation classes used by app pages.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `.spinshare-*` classes | CSS classes | Shared branded styling hooks used by homepage/sign-in UI |

## Props / Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| None | N/A | No | CSS stylesheet |

## Dependencies

- Internal: imported by `web/src/app/layout.tsx`.
- External: Tailwind utility classes compose with these bespoke classes in React components.

## Important Notes / NEVER Change

- Keep decorative layers non-interactive so buttons and forms remain clickable.
- Avoid abrupt dark global backgrounds for the public homepage/sign-in experience.
- Respect reduced-motion preferences where practical.

## Planned Change

Add diagonal money-stream keyframes and classes for the sign-in page:

- Full-screen decorative field behind the auth card.
- Multiple diagonal rows with alternating continuous movement directions.
- Repeated money icons per row so the field looks filled, not sparse.
- Low opacity and blur-safe layering so controls stay readable.

## Implemented Change

- Added `.money-stream-field`, `.money-stream-row`, `.money-stream-track`, and `.money-stream-icon` classes.
- Added alternating `money-stream-up` and `money-stream-down` keyframes for continuous diagonal movement.
- Kept the animation decorative and behind the sign-in card.
- Added a reduced-motion rule that pauses row animation when requested.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/page.test.tsx src/app/signin/page.test.ts` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web build` passed after allowing the configured Google font fetch.

## Planned Adjustment

Tune shared public-page glass styling so the fixed homepage header has visible backdrop blur even before the inner capsule is visually parsed.

Add sign-in-specific glass helpers:

- `.spinshare-signin-card` for a brighter translucent auth card with stronger backdrop blur.
- `.spinshare-back-home` for the top-left 3D glass home navigation button.

## Planned Enhancement: Sign-In Auth Panel 3D Depth

User feedback on 2026-06-14: the sign-in form container needs a stronger 3D effect.

Planned changes:

- Implement `.spinshare-signin-card` as a static elevated glass slab with layered outer shadows.
- Add pseudo-element highlights for a beveled top edge and soft bottom depth.
- Keep the class non-interactive and compatible with the existing Tailwind padding utilities.
- Avoid changing the shared input/button APIs or layout behavior.

## Implemented Enhancement: Sign-In Auth Panel 3D Depth

- Added `.spinshare-signin-card` as a dedicated elevated glass slab class.
- Added layered inset and outer shadows for a stronger raised container effect.
- Added pseudo-element highlights for the top bevel, inner sheen, and soft bottom shadow.
- Ensured direct children render above decorative pseudo-elements.

## Verification: Sign-In Auth Panel 3D Depth

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/signin/page.test.ts` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.
- Browser screenshot smoke check confirmed the sign-in auth card renders with the intended 3D depth and readable controls.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created documentation for theme.css before adding money-stream animations | Codex |
| 2026-06-13 | Synced docs with implemented money-stream animation classes and verification | Codex |
| 2026-06-13 | Documented sign-in glass card and top-left home button helper classes. | Codex |
| 2026-06-14 | Documented stronger 3D sign-in auth panel styling before editing CSS. | Codex |
| 2026-06-14 | Synced docs with implemented `.spinshare-signin-card` 3D depth styling and verification. | Codex |
