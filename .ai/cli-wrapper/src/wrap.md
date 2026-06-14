# wrap.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Runs the SpinShare CLI wrapper around a child command and coordinates ad display
with impression reporting.

## What It Does

- Spawns a target command and pipes stdout through `SpinnerRenderer`.
- Tracks contiguous spinner wait states.
- Reports impressions through the injected API client.
- Preserves child exit-code behavior.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `WaitStateTracker` | Class | Pure wait-state state machine. |
| `countImpressions` | Function | Counts qualifying impressions for a frame sequence. |
| `runWrap` | Function | Runs the child process wrapper. |

## Dependencies

- Internal: `./renderer.js`, `./api-client.js`.
- External: `node:child_process`, `node:os`, `@spinshare/core` types.

## Important Notes / NEVER Change

- The wrapper must not block the child output stream on tracking requests.
- No ad means no impression.
- Child exit code and signal mapping must remain unchanged.

## Planned Change

Change wait-state impression reporting from "first spinner frame" to "first
time a spinner run reaches the 3-second viewability floor":

- expose an injectable clock for pure tests
- keep one impression per qualifying contiguous wait state
- cancel/reset without reporting when a wait state ends before 3000 ms
- have `runWrap` wait for the threshold before calling `reportImpression`

## Implemented Change

`WaitStateTracker` now records wait start time, emits one impression only after
the run reaches 3000 ms, and exposes `qualify()` so quiet waits can count via a
timer. `runWrap` schedules a 3000 ms report at wait start, clears it when output
resumes, and sends `viewDurationMs` only for eligible waits.

## Verification

- Initial CLI focused run failed on immediate-report behavior and old API
  payload shape.
- Final focused CLI run passed: 3 files, 30 tests.
- Full root test run passed, including CLI 9 files and 68 tests.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created doc before adding CLI 3-second viewability logic. | Codex |
| 2026-06-13 | Synced doc with implemented CLI delayed viewability reporting. | Codex |
