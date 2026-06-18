# web/src/app/api/internal/flush/route.test.ts

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Regression tests for the protected internal flush trigger route.

## What It Does

- Verifies the route fails closed when the flush secret is missing.
- Verifies missing or incorrect bearer secrets are rejected without draining
  pending work.
- Verifies an authorized request runs one flush cycle and makes pending
  impressions visible in durable ledger/user/campaign stores.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `describe("POST /api/internal/flush")` | Vitest suite | Covers auth and successful reconciliation. |

## Dependencies

- **Internal:** `./route` - route under test.
- **Internal:** `@/server/container` - memory/mock container harness.
- **Internal:** memory adapters - seed users/campaigns and inspect durable state.

## Agent Decisions / Thoughts

- **2026-06-16 Codex:** Use the real memory container and real
  `runFlushCycle()` rather than mocking the service. That proves the endpoint
  closes the actual dashboard/payout visibility gap instead of only testing a
  function call.

## Important Notes / NEVER Change

- Keep at least one test asserting unauthorized requests do not drain pending
  work.
- Keep at least one test proving durable ledger/user/campaign changes happen
  after an authorized flush.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-16 | No executable endpoint covered the flush service. | Reconciliation existed only as a service. | Add route tests for protected execution. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented RED/GREEN tests for missing secret, unauthorized no-drain, and authorized durable flush. | Codex |
| 2026-06-16 | Created planned test coverage. | Codex |
