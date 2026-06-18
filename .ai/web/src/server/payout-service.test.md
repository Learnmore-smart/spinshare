# payout-service.test.ts

> Last updated: 2026-06-16 | Protection: PROTECTED

## Purpose

Regression tests for the money-moving withdrawal service.

## What It Does

- Verifies successful withdrawal pays the durable balance and debits it.
- Verifies below-minimum and not-connected paths move no money.
- Should verify concurrent withdraw attempts cannot double-pay the same balance.

## Dependencies

- `web/src/server/payout-service.ts`
- `MemoryUserRepository`
- `MockPayoutGateway`

## Planned Regression 2026-06-16

Add a RED test with a delaying payout gateway. Fire two `withdrawBalance()`
calls against one developer with one eligible balance. Only one call may reach
`createPayout()`, and the final balance must not go negative.

## Implemented Regression 2026-06-16

Added `does not double-pay when two withdrawals race for the same balance`.
The RED run failed because two payout calls were recorded. The GREEN run passed
after the atomic reservation fix.

## Planned Regression 2026-06-16 Payout Attempt Ledger

Add RED tests proving `withdrawBalance()` persists payout attempt state for
provider reconciliation:

- a successful withdrawal should leave one `paid` attempt with amount and
  provider payout id;
- a provider transfer exception should restore balance and leave one `failed`
  attempt with sanitized provider diagnostics.

## Implemented Regression 2026-06-16 Payout Attempt Ledger

Added payout attempt assertions for success, below-minimum, not-connected,
concurrent balance-changed, and provider-failed paths. The RED run failed with
`MemoryPayoutAttemptRepository is not a constructor`; the GREEN run passed after
adding the repository, wiring it into the service, and persisting attempt state.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Added payout attempt ledger regression coverage. | Codex |
| 2026-06-16 | Planned payout attempt ledger regression tests. | Codex |
| 2026-06-16 | Added concurrent withdraw double-pay regression test. | Codex |
| 2026-06-16 | Created before concurrent withdraw regression test. | Codex |
