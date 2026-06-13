# ad-controller.test.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Example-based tests for the VS Code extension ad controller.

## What It Does

- Tests notification display and dismissal.
- Tests impression reporting.
- Tests no-ad and duplicate-start behavior.
- Tests token passthrough.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `AdController` tests | Vitest suite | Controller lifecycle coverage. |

## Dependencies

- External: `vitest`.
- Internal: `./ad-controller`.

## Important Notes / NEVER Change

- Tests should use injected fake VS Code and client objects.
- Time-sensitive behavior should use injected schedulers or fake timers.

## Planned Change

Write failing tests that prove completion before 3000 ms reports no impression,
while a generation that remains visible for 3000 ms reports exactly once with
`viewDurationMs`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created doc before adding VS Code viewability tests. | Codex |
