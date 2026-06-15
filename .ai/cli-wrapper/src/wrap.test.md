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
- Windows spawn options enable shell execution so `.cmd` agent launchers can be wrapped.

## Implemented Test

Tests now use fake timers to prove short waits do not report, 3000 ms waits do
report once with `viewDurationMs`, no-ad waits still report zero, and exit-code
mapping is unchanged.

The suite also verifies `spawnOptionsForPlatform("win32")` enables shell
execution and POSIX platforms do not force shell execution.

## Verification

- Red run failed before implementation.
- Final focused CLI run passed: `api-client.test.ts`, `wrap.test.ts`, and
  `wrap.impressions.property.test.ts`.
- Windows spawn regression red run failed with `spawnOptionsForPlatform is not a
  function`; final focused `wrap.test.ts` passed with 17 tests.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Add regression coverage for Windows `.cmd` spawn options used by extension terminal shims. | Codex |
| 2026-06-13 | Created doc before adding CLI viewability regression tests. | Codex |
| 2026-06-13 | Synced doc with passing CLI viewability tests. | Codex |
