# LoadingStatus.tsx

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Claude-style LearnX loading status component for AI wait states.

## Current Contract

- Icon animation is a six-frame loop over exactly 1080ms: middle dot, asterisk, four-point star, six-point star, teardrop star, heavy teardrop star.
- Icons and brand separator must stay Unicode-escaped in source to avoid mojibake.
- `ICON_FRAME_MS` is 180ms and `ICON_LOOP_MS` is 1080ms.

## What It Does

- Renders a compact status row with an animated Unicode icon on the left and LearnX branding on the right.
- Uses Claude clay `#c15f3c` for the animated icon, loading verb, and brand emphasis.
- Cycles icons through the Claude Code sequence `· * ✢ ✶ ✻ ✽` over exactly 1080ms (six frames at 180ms each).
- Cycles loading ellipsis states from no dots to three dots over the same 1080ms loop, then switches to a new random verb.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `LoadingStatus` | React component | Client component for the LearnX loading row. |
| `LOADING_VERBS` | Constant | Clean English-only verb pool. |
| `LOADING_ICONS` | Constant | Six-frame Claude Code icon sequence (`· * ✢ ✶ ✻ ✽`). |
| timing helpers | Functions | Pure helpers used by the component and tests to lock the 1440ms animation loop. |

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

- The full icon round trip must remain exactly 1080ms: six frames at 180ms each.
- The ellipsis cycle must remain exactly 1080ms: four visible states at 360ms each.
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
| 2026-06-15 | Restored the documented six-frame 1080ms icon contract after the component drifted to eight frames. | Codex |
| 2026-06-14 | Correct `LOADING_ICONS` to Claude Code sequence `· * ✢ ✶ ✻ ✽` (1080ms loop). | Codex |
| 2026-06-14 | Align `LOADING_ICONS` with Claude Code sequence `✶ * ✢ · ✻ ✢ ✽` (1260ms loop). | Codex |
| 2026-06-14 | Slow Claude Unicode icon frame interval to 180ms (1440ms full loop). | Codex |
| 2026-06-14 | Slow Claude Unicode icon frame interval to 150ms (1200ms full loop). | Codex |
| 2026-06-14 | Slow Claude Unicode icon frame interval to 120ms (1.5× slower than 80ms). | Codex |
| 2026-06-14 | Speed up Claude Unicode icon frame interval from 125ms to 80ms (640ms full loop). | Codex |
| 2026-06-13 | Created documentation for Claude-style LearnX loading component refactor | Codex |
| 2026-06-13 | Implemented single-clock Claude-style LearnX loading status component | Codex |
