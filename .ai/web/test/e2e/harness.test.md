# harness.test.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Regression tests for the e2e harness process teardown behavior.

## What It Does

- Verifies the harness process terminator resolves promptly for a long-running Node child.
- Guards against e2e runs hanging after assertions complete.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `terminateProcessTree` behavior test | test | Confirms e2e child process teardown is bounded and effective. |

## Dependencies

- **Internal:** `./harness` - process termination helper under test.
- **External:** Node `child_process`, Vitest - spawns a child process and asserts teardown.

## Important Notes / NEVER Change

- Keep the test fast; it should not start a real Next server.
- Do not depend on production credentials or fixed ports.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-13 | Full e2e command could hang or exit without a normal summary after tests completed. | Harness teardown was not independently covered. | Add a focused child-process teardown regression. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created planned test documentation. | Codex |
| 2026-06-13 | Added regression coverage for bounded child-process teardown. | Codex |
