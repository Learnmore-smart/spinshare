# web/src/app/api/payouts/withdraw/route.test.ts

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Route-level regression tests for developer cash-out.

## What It Does

- Verifies the route maps successful service results to JSON.
- Verifies typed service failures keep their status/error code.
- Verifies provider exceptions are returned as sanitized 502 responses.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `POST /api/payouts/withdraw` tests | Vitest suite | Covers HTTP adapter behavior around the payout service. |

## Dependencies

- **Internal:** mocked `auth`.
- **Internal:** mocked `getContainer`.
- **Internal:** mocked `withdrawBalance`.

## Agent Decisions / Thoughts

- **2026-06-16 Codex:** The route test should not retest balance reservation;
  that belongs in `payout-service.test.ts`. This test is for the HTTP boundary
  and error redaction.
- **2026-06-16 Codex:** RED failed because provider errors bubbled from `POST`.
  GREEN passed with 3 route tests after adding sanitized mapping.

## Important Notes / NEVER Change

- Keep provider secret redaction explicit in the test body.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Added RED/GREEN verification notes. | Codex |
| 2026-06-16 | Created planned route test documentation before writing RED test. | Codex |

## Planned Coverage 2026-06-16 Developer Payout Events

Add RED tests proving `POST /api/payouts/withdraw` records developer payout
activity for success, typed blocked attempts, and provider failures.

## Implemented Coverage 2026-06-16 Developer Payout Events

Added route coverage for success, typed blocked attempt, and provider failure
payout activity recording.

## Implemented Coverage 2026-06-16 Payout Attempt Ledger

The mocked container now includes `payoutAttempts`, matching the route's real
service dependency shape while keeping the route tests focused on HTTP mapping
and activity rows.
