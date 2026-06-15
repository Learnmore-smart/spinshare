# mock-payout-gateway.ts

> Protection: STANDARD

## Purpose（一句话人话）
Credential-free local/test stand-in for Stripe Connect payouts so the dashboard "Connect payouts / Cash out" flow works end-to-end with zero external deps.

## Public API
| Name | Type | Description |
|------|------|-------------|
| MockPayoutGateway | class implements PayoutGateway | mints `acct_mock_*`/`po_mock_*` ids; onboarding link bounces back to returnUrl with `?payouts=connected`; status always payoutsEnabled=true |

## Dependencies
- **Internal:** `../../ports/payout-gateway`, `./clock` (IdGenerator).

## Important Notes
- Selected when `STRIPE_MODE=mock` (local default). Onboarding "completes" instantly.

## Change History
| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Created | Kiro |
