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

## Change History
| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Created (extracted from withdraw route) | Kiro |
