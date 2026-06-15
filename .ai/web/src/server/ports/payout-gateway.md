# payout-gateway.ts

> Protection: STANDARD

## Purpose（一句话人话）
Port (interface) for developer payouts via Stripe Connect Express — create/reuse a connected account, generate hosted onboarding links, read payout eligibility, and transfer earnings out.

## Public API
| Name | Type | Description |
|------|------|-------------|
| PayoutGateway | interface | ensureConnectedAccount, createOnboardingLink, getAccountStatus, createPayout |
| EnsureConnectedAccountInput / OnboardingLinkInput / ConnectAccountStatus / PayoutInput / PayoutResult | interfaces | request/response shapes |

## Dependencies
- None (pure interface). Implemented by `StripePayoutGateway` (prod) and `MockPayoutGateway` (local).

## Important Notes
- Credential-tolerant: implementations must not touch Stripe at import time.
- Selected by `STRIPE_MODE` in `container.ts` (`mock` local, `test|live` prod).

## Change History
| Date | Change | Author |
|------|--------|--------|
| 2026-06-14 | Created with payouts feature | Kiro |
