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

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Created docs for CLI direct-execution regression test. | Codex |
