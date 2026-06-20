# canonical-user-id.test.ts

> Last updated: 2026-06-20 | Protection: STANDARD

## Purpose

Regression tests for canonical identity normalization and key stability.

## Planned Coverage

- Case/whitespace normalization.
- Empty email rejection.
- Provider-separated mapping keys.

## Verification

Four Vitest cases pass, including non-disclosure of raw identity values.
