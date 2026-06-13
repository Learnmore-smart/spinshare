# theme.css

> Last updated: 2026-06-13 | Protection: STANDARD

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

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created documentation for theme.css before adding money-stream animations | Codex |
| 2026-06-13 | Synced docs with implemented money-stream animation classes and verification | Codex |
| 2026-06-13 | Documented sign-in glass card and top-left home button helper classes. | Codex |
