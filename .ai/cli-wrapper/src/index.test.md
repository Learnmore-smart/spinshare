# index.test.ts

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose
Regression tests for the CLI entrypoint argument parsing and direct-execution guard.

## What It Does

- Verifies direct execution is detected for normalized file URLs and Windows-style paths.
- Verifies imports or missing script paths do not trigger CLI execution.

## Public API

| Name | Type | Description |
|------|------|-------------|
| Vitest cases | tests | Cover CLI entrypoint helpers. |

## Props / Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| N/A | N/A | N/A | Test file only. |

## Dependencies

- **Internal:** `./index` - exports `isDirectExecution`.
- **External:** `vitest`, `node:url`, `node:path`.

## Important Notes / NEVER Change

- Keep the Windows path regression; it protects the packaged binary on this workspace.
- Keep direct execution testable without actually terminating the Vitest
  process; inject fake run/exit functions when testing binary exit behavior.

## Planned Change 2026-06-17

Add regression tests for direct CLI process exit behavior:

- successful direct execution should pass the resolved `main()` code to the
  injected exit function;
- failed direct execution should write a safe `spinshare:` error and exit with
  code `1`.

These tests protect the local CLI smoke: on Windows, wrapped PTY commands can
finish but leave native handles alive unless the actual binary exits explicitly.

## Implemented Test 2026-06-17

Added `runDirectExecution` tests proving successful direct execution exits with
the resolved `main()` code and rejected direct execution writes `spinshare:
<message>` before exiting `1`.

## Verification 2026-06-17

- RED: focused `index.test.ts` failed with `runDirectExecution is not a
  function`.
- GREEN: focused `index.test.ts` + `wrap.test.ts` passed with 27 tests.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Created docs for CLI direct-execution regression test. | Codex |
