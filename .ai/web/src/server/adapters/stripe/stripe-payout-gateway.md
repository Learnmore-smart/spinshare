# stripe-payout-gateway.ts

> Protection: PROTECTED (moves real money)

## Purpose（一句话人话）
Production `PayoutGateway` backed by the Stripe SDK: creates Express connected accounts, account-onboarding links, reads payout eligibility, and transfers developer earnings from the platform balance to the connected account.

## Public API
| Name | Type | Description |
|------|------|-------------|
| StripePayoutGateway | class implements PayoutGateway | ensureConnectedAccount → accounts.create; createOnboardingLink → accountLinks.create; getAccountStatus → accounts.retrieve; createPayout → transfers.create |

## Dependencies
- **External:** `stripe` — Stripe SDK.
- **Internal:** `../../ports/payout-gateway`, `./stripe-gateway` (StripeGatewayEnv).

## Important Notes / NEVER Change
- Lazy client: `STRIPE_SECRET_KEY` read on first credentialed call, never at import.
- Payout = `transfers.create({ destination })` (Connect transfer to the account); Stripe then pays the developer's bank per the account's payout schedule.
- Requires Stripe Connect enabled on the platform account.

## Change History
| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Created | Kiro |
