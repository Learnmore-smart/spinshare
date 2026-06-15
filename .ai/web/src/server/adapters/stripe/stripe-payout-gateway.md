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

## Planned Fix (2026-06-15)

Bug: Connect onboarding fails with Stripe `invalid_request_error`, and the app surfaces it as a generic 500.

Likely causes found in code:
- Stripe client defaults to API version `2025-02-24.acacia` while Stripe currently reports `2026-05-27.dahlia`.
- New connected accounts are created with legacy `type: "express"` instead of explicit controller properties.

Fix:
- Use the shared Stripe client factory pinned to `2026-05-27.dahlia`.
- Build account create params with `controller.stripe_dashboard.type = "express"`, `controller.requirement_collection = "stripe"`, and platform-paid fees/losses, while requesting the `transfers` capability.
- Keep account link onboarding as `account_onboarding` and use `collection_options.fields = "eventually_due"`.

## Planned Accounts v2 Follow-Up (2026-06-15)

The first fix removed `type: "express"` but still called v1 `accounts.create`. Stripe's current Accounts v2 guidance for new platforms uses `POST /v2/core/accounts`; for this app's separate-charge-and-transfer payout model the connected account should be a recipient account with `configuration.recipient.capabilities.stripe_balance.stripe_transfers.requested = true`, `dashboard = "express"`, and Stripe-hosted requirement collection. Implement a narrow raw Accounts v2 client because the installed Stripe SDK exposes `v2.core` but not `v2.core.accounts`.

## Implemented Accounts v2 Fix (2026-06-15)

- `buildConnectedAccountCreateParams` now returns the Accounts v2 recipient payload.
- `createConnectedAccount` posts JSON to `/v2/core/accounts` with the shared `STRIPE_API_VERSION`.
- `ensureConnectedAccount` uses the raw Accounts v2 helper for new accounts and still reuses an existing account id when present.
- SDK-backed calls remain in place for Account Links, account status, and transfers.

## Accounts v2 Payload Correction (2026-06-15)

Stripe's Accounts v2 create parameter list includes recipient capabilities, `contact_email`, `dashboard`, `defaults`, and `include`; it does not show `metadata` as a create parameter for this endpoint. Remove metadata from the raw create payload and rely on the local user record for account reconciliation.

## Implemented Payload Correction

The Accounts v2 create payload no longer includes `metadata`; the developer-to-account link remains persisted by `users.setConnectAccount`.

## Change History
| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Removed unsupported `metadata` from Accounts v2 create payload. | Codex |
| 2026-06-15 | Planned removal of unsupported `metadata` from Accounts v2 create payload. | Codex |
| 2026-06-15 | Implemented raw Accounts v2 recipient account creation for Stripe payout onboarding. | Codex |
| 2026-06-15 | Planned migration of new payout account creation to Accounts v2 recipient configuration. | Codex |
| 2026-06-15 | Documented Stripe API version and controller-based Connect account fix. | Codex |
| 2026-06-14 | Created | Kiro |
