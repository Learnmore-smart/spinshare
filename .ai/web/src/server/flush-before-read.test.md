# web/src/server/flush-before-read.test.ts

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Regression tests for the best-effort flush-before-read helper.

## What It Does

- Proves pending impressions become durable before dashboard-style reads.
- Proves flush failures are swallowed and logged instead of thrown.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `flushPendingForRead` tests | Vitest suite | Covers success and failure behavior. |

## Dependencies

- **Internal:** memory repositories and counter store for deterministic pending
  impression setup.
- **Internal:** `flushPendingForRead`.

## Agent Decisions / Thoughts

- **2026-06-16 Codex:** RED should fail because `flush-before-read.ts` does not
  exist. GREEN should pass after the minimal helper delegates to `runFlushCycle`.
- **2026-06-16 Codex:** RED failed on missing module. GREEN passed with 2 tests
  after adding the helper.

## Important Notes / NEVER Change

- Keep these tests focused on helper behavior, not route rendering.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Added RED/GREEN verification notes. | Codex |
| 2026-06-16 | Created planned test documentation before writing RED test. | Codex |
