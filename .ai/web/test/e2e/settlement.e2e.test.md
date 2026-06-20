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

2026-06-17 planned update:

- Import the real `GET /api/ad` route handler into the in-process settlement
  test.
- After funding the campaign and before calling `/api/track`, call `/api/ad`
  with the same mock `Device_Auth_Token`.
- Assert the selected campaign is the funded campaign. This mirrors the real
  client flow and creates the required per-developer pending progress record.
- Keep the production route behavior unchanged; this is an e2e test contract
  repair after `/api/track` began rejecting campaign ids that were not first
  served to the developer.

## Implemented Change

The successful settlement path now sends `viewDurationMs: 3000` with the
campaign id so the e2e route call matches the shared 3-second viewability
contract.

2026-06-17 implemented update:

- The successful in-process settlement path now calls the real `GET /api/ad`
  route with the same mock token after funding the campaign.
- The test asserts that `/api/ad` selected the funded campaign before it posts
  `/api/track`, so the route has the same pending progress context a real
  client would have.

## Verification

- Full workspace tests passed with the updated settlement payload:
  `corepack pnpm@9.12.0 test`.
- 2026-06-17 focused verification:
  - `corepack pnpm@9.12.0 test:e2e` passed with 3 files / 7 tests.
  - `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/ad/route.test.ts src/app/api/track/route.test.ts src/server/bidding-service.test.ts`
    passed with 3 files / 18 tests.
  - `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-17 | E2E settlement returned `422 invalid_or_insufficient_campaign` on the in-process `/api/track` success path. | The current tracking route requires a same-developer pending progress record created by `/api/ad`; the old test posted directly to `/api/track`, which now looks like an arbitrary campaign attribution attempt. | Drive the in-process flow through `/api/ad` first using the same mock token, then post `/api/track` for the served campaign. |
| 2026-06-13 | File comments still described an old production bundle import issue as active after `next start` verification passed. | Prior handoff notes were not updated after the ESM-only core fix and production-start e2e validation. | Update comments to reflect the current limitation accurately: valid credited `/api/track` cannot be minted over HTTP in mock mode because there is no test approval endpoint, while production route bundling now starts successfully. |

## Planned Change 2026-06-20 Canonical Identity

Mark the seeded OAuth identity email as provider-verified under the strengthened
`ExternalIdentity` contract.

## Implemented Change 2026-06-20 Canonical Identity

The seeded developer identity now declares its email provider-verified.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created documentation for settlement comment cleanup. | Codex |
| 2026-06-13 | Added current production-start status note to the settlement test comment. | Codex |
| 2026-06-13 | Documented e2e tracking payload update for 3-second viewability. | Codex |
| 2026-06-17 | Updated settlement e2e to call `/api/ad` before `/api/track`, matching cumulative progress enforcement. | Codex |
