# wrap.test.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Unit and integration-style tests for the CLI wrapper wait-state logic.

## What It Does

- Tests `WaitStateTracker` behavior.
- Tests `countImpressions`.
- Tests `runWrap` with a fake child process and fake API client.
- Guards child exit-code passthrough.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `WaitStateTracker` tests | Vitest suite | Pure state machine coverage. |
| `runWrap` tests | Vitest suite | Fake child process wrapper coverage. |

## Dependencies

- External: `vitest`, `node:events`.
- Internal: `./wrap.js`.

## Important Notes / NEVER Change

- Tests should not spawn real child processes.
- Tests should use fake time or injected clocks for viewability behavior.

## Planned Change

Write failing tests that prove:

- spinner runs shorter than 3000 ms do not count
- spinner runs at or above 3000 ms count once
- `runWrap` sends no request when output resumes before the threshold
- `runWrap` sends `viewDurationMs` when the threshold is met

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created doc before adding CLI viewability regression tests. | Codex |
