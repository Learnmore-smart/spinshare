# payout-service.ts

> Protection: PROTECTED (moves real money)

## Purpose（一句话人话）
The testable money-moving core behind `POST /api/payouts/withdraw`: pays out a developer's durable balance to their connected Stripe account and debits it.

## Public API
| Name | Type | Description |
|------|------|-------------|
| withdrawBalance(deps, developerId) | async fn → WithdrawResult | 409 not_connected / 422 below_minimum / { ok, paidOutCents, payoutId } |
| WithdrawResult, NOT_CONNECTED_ERROR, BELOW_MINIMUM_ERROR | types/consts | typed outcomes |

## Dependencies
- **Internal:** ports (UserRepository, PayoutGateway). **External:** `@spinshare/core` (MINIMUM_PAYOUT_CENTS).

## Important Notes / NEVER Change
- Pays only the durable (flushed) balance — never the unflushed hot-path delta.
- Confirms `payouts_enabled` with Stripe before moving money.
- Debits exactly the amount paid via an atomic balance delta (concurrent credits safe).
- Failure paths move no money.

## Planned Bug Fix 2026-06-16 Concurrent Double Withdraw

**Bug:** `withdrawBalance()` currently reads `user.balanceCents`, calls
`payouts.createPayout()`, then debits with `applyBalanceDeltaCents()`. Two
concurrent requests can both read the same balance, both create Stripe
transfers, and then double-debit the durable balance.

**Fix strategy:** Add an atomic `UserRepository.tryDebitBalanceCents(id,
amountCents)` reservation step. `withdrawBalance()` should read the user,
verify Connect/payout eligibility, confirm the durable balance meets the
minimum, atomically reserve exactly that amount, and only then call Stripe. If
reservation loses a race, return a typed failure without moving money. If Stripe
fails after reservation, best-effort refund the reserved balance before
rethrowing.

This is a minimal safety fix for double-pay risk, not a full payout
ledger/reconciliation system.

## Implemented Bug Fix 2026-06-16 Concurrent Double Withdraw

`withdrawBalance()` now atomically reserves the current durable balance with
`users.tryDebitBalanceCents()` before calling the payout gateway. If another
withdraw already reserved the balance, the losing request returns
`409 balance_changed` and never calls Stripe. If the payout gateway throws after
reservation, the service restores the reserved amount with
`applyBalanceDeltaCents()`.

## Implemented Change 2026-06-16 Payout Attempt Ledger

`withdrawBalance()` now writes provider reconciliation attempts through
`PayoutAttemptRepository`:

- blocked attempts for not-connected, below-minimum, or balance-changed paths;
- pending attempts before reserving/calling Stripe;
- paid attempts with provider payout id after success;
- failed attempts with provider request/status/code after provider exceptions,
  while still restoring the reserved balance.

## Change History
| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Added payout attempt reconciliation writes. | Codex |
| 2026-06-16 | Implemented atomic balance reservation before payout transfer. | Codex |
| 2026-06-16 | Planned atomic reservation fix for concurrent withdraw double-pay risk. | Codex |
| 2026-06-14 | Created (extracted from withdraw route) | Kiro |
