# settlement.e2e.test.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

End-to-end settlement verification for the 60/40 money split and `/api/track` boundary behavior.

## What It Does

- Starts the web app through the shared e2e harness.
- Checks malformed `/api/track` requests return `400`.
- Runs the funded impression settlement path in-process against the same container and route handlers so durable memory state is observable.
- Forces a flush and asserts developer credit, campaign budget decrease, retention, and conservation.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `e2e settlement` | test suite | Requirement 11 settlement coverage. |

## Dependencies

- **Internal:** `./harness`, `@/server/container`, `@/server/flush-service`, route handlers, mock adapters.
- **External:** Vitest, Fetch API - test execution and HTTP boundary call.

## Important Notes / NEVER Change

- Monetary expectations must come from `@spinshare/core`.
- Keep the credited settlement assertion deterministic and observable; do not depend on unseeded server-process memory.
- The HTTP boundary test should remain valid in both dev and production-start modes.

## Planned Change

Update in-process successful `/api/track` calls to include
`viewDurationMs: 3000`, matching the new shared tracking contract.

## Implemented Change

The successful settlement path now sends `viewDurationMs: 3000` with the
campaign id so the e2e route call matches the shared 3-second viewability
contract.

## Verification

- Full workspace tests passed with the updated settlement payload:
  `corepack pnpm@9.12.0 test`.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-13 | File comments still described an old production bundle import issue as active after `next start` verification passed. | Prior handoff notes were not updated after the ESM-only core fix and production-start e2e validation. | Update comments to reflect the current limitation accurately: valid credited `/api/track` cannot be minted over HTTP in mock mode because there is no test approval endpoint, while production route bundling now starts successfully. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created documentation for settlement comment cleanup. | Codex |
| 2026-06-13 | Added current production-start status note to the settlement test comment. | Codex |
| 2026-06-13 | Documented e2e tracking payload update for 3-second viewability. | Codex |
