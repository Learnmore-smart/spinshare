# LoadingStatus.tsx

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Claude-style LearnX loading status component for AI wait states.

## What It Does

- Renders a compact status row with an animated Unicode icon on the left and LearnX branding on the right.
- Uses Claude clay `#c15f3c` for the animated icon, loading verb, and brand emphasis.
- Cycles icons through a ping-pong sequence over exactly 1 second.
- Cycles loading ellipsis states from no dots to three dots over exactly 1 second, then switches to a new random verb.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `LoadingStatus` | React component | Client component for the LearnX loading row. |
| `LOADING_VERBS` | Constant | Clean English-only verb pool. |
| `LOADING_ICONS` | Constant | Eight-frame ping-pong icon sequence. |
| timing helpers | Functions | Pure helpers used by the component and tests to lock 1-second timing. |

## Props / Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `className` | `string` | No | Optional wrapper classes. |
| `initialVerb` | `LoadingVerb` | No | Deterministic initial verb override for tests or demos. |

## Dependencies

- **Internal:** `@/lib/utils` - class name composition helper.
- **External:** `next/image` - optimized LearnX favicon rendering.
- **External:** `react` - client component state and interval hook.

## Important Notes / NEVER Change

- The full icon round trip must remain exactly 1000ms: eight frames at 125ms each.
- The ellipsis cycle must remain exactly 1000ms: four visible states at 250ms each.
- Keep Unicode icons encoded safely so the source file does not corrupt them.
- The brand text must render as `LearnX · Know exactly what to study`.

## Planned Change: Claude-Style Timing Refactor

**Date:** 2026-06-13

Refactor the existing component to replace corrupted icon and middle-dot literals, derive both animations from one 125ms interval, expose pure timing helpers, use `/learnx/favicon-32x32.png`, and keep the layout Tailwind-only.

## Implementation Notes

- Implemented a single `setInterval` at `ICON_FRAME_MS` (`125`) that advances eight icon frames per second.
- Derived ellipsis state from the icon frame index so both animations reset together at the 1000ms boundary.
- Exported `getIconForElapsedMs`, `getDotCountForElapsedMs`, `formatLoadingText`, and `pickRandomVerb` for deterministic tests.
- Rendered the root as `role="status"` with a stable accessible label and Tailwind-only layout.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-13 | Icons and brand separator render as mojibake | Unicode literals were corrupted in source | Use Unicode escape constants and tested brand text. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created documentation for Claude-style LearnX loading component refactor | Codex |
| 2026-06-13 | Implemented single-clock Claude-style LearnX loading status component | Codex |
