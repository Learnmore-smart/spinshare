# wrap.impressions.property.test.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Property tests for CLI wait-state impression counting.

## What It Does

- Generates arbitrary frame sequences.
- Compares `WaitStateTracker` and `countImpressions` to an independent model.

## Public API

| Name | Type | Description |
|------|------|-------------|
| Property 22 | Fast-check property | Impression count invariant. |

## Dependencies

- External: `vitest`, `fast-check`.
- Internal: `./wrap.js`.

## Important Notes / NEVER Change

- The property model must be independent from production implementation details.
- Keep generated data bounded so the suite stays fast.

## Planned Change

Update the property model from "one impression per spinner run" to "one
impression per spinner run whose duration reaches the 3000 ms minimum".

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created doc before updating CLI impression property for viewability. | Codex |
