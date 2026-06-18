# TiltCard.test

> Last updated: 2026-06-18 | Protection: STANDARD

## Purpose

Regression tests for the shared `TiltCard` dashboard interaction surface.

## What It Does

- Renders `TiltCard` to static markup so SSR-safe inline styles can be inspected.
- Verifies that the inline transition includes non-transform hover chrome, most
  importantly `box-shadow`, so dashboard card shadows animate smoothly instead
  of snapping when the CSS `:hover` shadow applies.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `TiltCard` tests | Vitest suite | Guards rendered transition contract |

## Dependencies

- Internal: `web/src/components/TiltCard.tsx`
- External: React, `react-dom/server`, Vitest

## Agent Decisions / Thoughts

- 2026-06-18 Codex: This test intentionally checks rendered markup instead of
  browser mouse movement because the bug is caused by the inline transition
  string overriding CSS transitions before any pointer event needs to run.

## Important Notes / NEVER Change

- Keep at least one test that fails if `box-shadow` is removed from the inline
  transition. That is the regression the user reported.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Implemented static render regression test for TiltCard transform and box-shadow transition output | Codex |
| 2026-06-18 | Created regression test plan for smooth TiltCard shadow transitions | Codex |
