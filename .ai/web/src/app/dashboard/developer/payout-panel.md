# payout-panel.tsx

> Protection: STANDARD

## Purpose（一句话人话）
The live "Get paid" control in the developer dashboard. Replaces the former dead "Connect payouts" button with a real Stripe Connect connect/onboard/cash-out flow.

## What It Does
- On mount fetches `/api/payouts/status` (connected? payouts enabled? balance?).
- Not connected / onboarding incomplete → "Connect payouts" / "Finish payout setup" → POST `/api/payouts/connect` → redirect to onboarding url.
- Connected + enabled + balance ≥ $5.00 → "Cash out $X" → POST `/api/payouts/withdraw`.
- Caption shows below-minimum remaining, processing, success, or error.

## Public API
| Name | Type | Description |
|------|------|-------------|
| PayoutPanel | React component | renders button + status caption (parent renders heading/body) |

## Dependencies
- **Internal:** `@spinshare/core` (MINIMUM_PAYOUT_CENTS), `@/lib/i18n/locale-provider`, `./developer-dashboard-parts` (money).

## Important Notes
- i18n strings: connectPayouts, payoutFinishOnboarding, cashOut, payoutConnecting, payoutProcessing, payoutSuccess, payoutError, payoutAboveMinimum, payoutBelowMinimum.

## Change History
| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Created | Kiro |
