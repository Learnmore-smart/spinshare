# terminal-auto-wrap.test.ts

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Unit tests for the SpinShare terminal auto-wrap shim planner.

## What It Does

- Verifies configured agent names are sanitized and deduplicated.
- Verifies the generated launcher removes the shim directory from `PATH` before spawning the real agent.
- Verifies the terminal environment mutation prepends the shim directory with the platform path delimiter.
- Verifies Windows and POSIX shim files are generated for configured agents.

## Dependencies

- Internal: `terminal-auto-wrap.ts`.
- External: Vitest.

## Planned Changes

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Add red tests for the missing extension auto-wrap behavior before implementing production code. | Codex |

## Implemented Test

- Covers safe command-name normalization and fallback to `claude`.
- Covers launcher content for recursive PATH removal and SpinShare API URL forwarding.
- Covers shim file generation for Windows and POSIX shells.
- Covers environment collection clearing and PATH prepending.

## Verification

- Initial red run failed loading `./terminal-auto-wrap`.
- Final focused run passed: 5 tests.
