# web/src/app/api/payouts/status/route.test.ts

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Regression tests for payout status reads.

## What It Does

- Verifies unauthenticated requests are rejected.
- Verifies authenticated payout status runs a best-effort pending flush before
  reading durable user balance.
- Verifies returned balance and Connect status mapping.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `GET /api/payouts/status` tests | Vitest suite | Covers status response and flush-before-read ordering. |

## Dependencies

- **Internal:** mocked `auth`.
- **Internal:** mocked `getContainer`.
- **Internal:** mocked `flushPendingForRead`.

## Agent Decisions / Thoughts

- **2026-06-16 Codex:** The key regression is ordering: flush must happen before
  `users.getById()` so `balanceCents` reflects any just-flushed credit.
- **2026-06-16 Codex:** RED failed because the route did not call
  `flushPendingForRead`. GREEN passed with 3 tests after route wiring.

## Important Notes / NEVER Change

- Keep this test route-level; reconciliation math belongs in
  `flush-before-read.test.ts` and `flush-service` tests.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Added RED/GREEN verification notes. | Codex |
| 2026-06-16 | Created planned route test documentation before writing RED test. | Codex |
