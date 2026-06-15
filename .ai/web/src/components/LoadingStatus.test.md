# LoadingStatus.test.tsx

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Focused Vitest coverage for the LearnX loading status timing contract.

## What It Does

- Verifies the ping-pong icon sequence and exact 1-second loop math.
- Verifies the 1-second ellipsis cycle and formatting with a space before visible dots.
- Verifies verb selection excludes the current verb when switching cycles.
- Verifies the component renders the required LearnX brand text and Claude clay styling hooks.

## Public API

| Name | Type | Description |
|------|------|-------------|
| Vitest suite | Test file | Exercises pure timing helpers and static component markup. |

## Props / Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| none | n/a | n/a | This file exports no public runtime API. |

## Dependencies

- **Internal:** `./LoadingStatus` - component and exported helpers under test.
- **External:** `react-dom/server` - static markup rendering for component smoke coverage.
- **External:** `vitest` - assertions and test runner.

## Important Notes / NEVER Change

- Tests should lock exact durations: 180ms icon frames, 360ms ellipsis states, 1080ms loops.
- Keep tests deterministic by passing `initialVerb` and seeded random callbacks.

## Planned Change: Timing Contract Tests

**Date:** 2026-06-13

Add failing tests before implementation for icon sequence, loop durations, ellipsis formatting, random verb switching, clean English verb list, and static LearnX rendering.

## Implementation Notes

- Added five Vitest tests covering the exact clean verb list, Claude clay color, icon ping-pong sequence, ellipsis timing, different-verb selection, and static LearnX markup.
- Verified the red step against the pre-refactor component, then verified the green step after implementation.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-13 | Loading component timing was not covered by tests | Existing component was unreferenced and untested | Add focused helper and render tests. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created documentation for loading status test coverage | Codex |
| 2026-06-13 | Added focused Vitest coverage for LoadingStatus timing and rendering | Codex |
