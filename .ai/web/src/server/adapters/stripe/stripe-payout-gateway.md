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

## Planned Connect Smoke Fix (2026-06-17)

External Stripe smoke exposed two real Connect blockers:
- Accounts v2 create currently sends `defaults.responsibilities.requirements_collector`, but Stripe's Accounts v2 create endpoint rejects that field because requirement collection is calculated by Stripe.
- The current Stripe account returns `non_connect_platform_accounts_v2_access_blocked` even after removing the invalid field, so a v2-only account creation path cannot onboard developers on this account.

Fix plan:
- Remove `requirements_collector` from the Accounts v2 create payload.
- Keep Accounts v2 as the preferred first attempt.
- Add a narrow fallback to SDK `accounts.create` using modern controller properties for an Express account when Stripe reports Accounts v2 unavailable/blocked.
- Do not change account links, account status, transfer creation, campaign logic, or balances.

Regression risks:
- Never fall back on generic invalid payload errors; those should still fail loudly.
- The fallback must not use legacy `type: "express"` and must request only the `transfers` capability.

## Implemented Connect Smoke Fix (2026-06-17)

- Removed `requirements_collector` from the Accounts v2 create payload.
- Added `buildLegacyConnectedAccountCreateParams()` for controller-based Express fallback account creation.
- Added `isAccountsV2UnavailableError()` so fallback is limited to known Accounts v2 unavailable signals.
- `ensureConnectedAccount()` now attempts Accounts v2 first and falls back to SDK `accounts.create()` only when Accounts v2 is blocked/unavailable.

Verification:
- RED focused test failed on the unsupported `requirements_collector` field and missing fallback helpers.
- GREEN focused test passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/stripe/stripe-payout-gateway.test.ts`
  with 5 tests.
- Web typecheck passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web lint`.
- External Stripe Connect smoke no longer hit the invalid Accounts v2 field, but the platform account still cannot create connected accounts until Connect is enabled in Stripe Dashboard. Stripe returned:
  `You can only create new accounts if you've signed up for Connect`.

## Planned Accounts v2 Identity Country Fix (2026-06-17)

Runtime Stripe Connect attempt returned `identity_country_required` for the Accounts v2 recipient account create call. Stripe's Accounts v2 create docs list `identity.country` as the country where the account holder resides or business is legally established, and the error table defines `identity_country_required` as missing `identity.country`.

Fix plan:
- Add `identity: { country: "us" }` to the Accounts v2 recipient create payload, matching the existing v1 fallback `country: "US"` and current USD-only payout model.
- Keep identity entity type and the rest of onboarding details for Stripe-hosted onboarding.
- Add request-shape coverage so this provider-required field cannot be removed accidentally.

## Implemented Accounts v2 Identity Country Fix (2026-06-17)

- `buildConnectedAccountCreateParams()` now includes `identity: { country: "us" }`.
- The Accounts v2 request-shape test asserts the field is present.
- Focused verification passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/stripe/stripe-payout-gateway.test.ts`
  with 5 tests.

## Centralized Payout Country (2026-06-17)

Reviewed Codex's `identity: { country: "us" }` fix. Root cause was correct (the
Accounts v2 create payload omitted `identity.country`), but hardcoding `"us"` in
the v2 path while the legacy fallback separately hardcoded `"US"` lets the two
drift apart and reads as accidental rather than an intentional US-only scope.

Decision (with user): stay US-only for now; defer international. Research
confirmed self-serve cross-border payouts only reach US/UK/EEA/CA/CH, that
non-US recipients need the recipient service agreement (US uses full ToS), and
that non-US accounts settle in their local currency (not USD). Full deferred
plan: `.ai/docs/payout-connect-country-fix.md`.

Change:
- Added one `PAYOUT_COUNTRY = "US"` constant as the single source of truth.
- `buildConnectedAccountCreateParams()` derives `identity.country` via
  `PAYOUT_COUNTRY.toLowerCase()`; `buildLegacyConnectedAccountCreateParams()`
  uses `PAYOUT_COUNTRY`. The `identity.country` type widened `"us"` → `string`.
- No behavior change for the working US path; no route/frontend changes.
- Added a single-source invariant test (v2 lowercase === legacy lowercase === `"us"`).

Verification:
- Focused gateway test passed (6 tests).
- Connect route test passed (3 tests).
- Web typecheck passed (`corepack pnpm@9.12.0 --filter @spinshare/web lint`).

## Planned Accounts v2 Capability Dependency Fix (2026-06-17)

Runtime Stripe Accounts v2 create returned
`capability_not_available_without_other_capability`: requesting
`configuration.recipient.capabilities.stripe_balance.stripe_transfers` requires
also requesting `configuration.merchant.capabilities.card_payments`.

Root cause:
- `buildConnectedAccountCreateParams()` only configures the recipient balance
  transfer capability.
- The app uses Accounts v2 recipient accounts for Connect onboarding, but
  Stripe now validates the merchant card payments dependency on the same v2
  account create request.

Fix plan:
- Add `configuration.merchant.capabilities.card_payments.requested = true` to
  the Accounts v2 create payload.
- Include `configuration.merchant` in the v2 `include` list so Stripe returns
  the requested merchant configuration for diagnostics.
- Add regression coverage requiring both the merchant dependency and the
  recipient transfer capability to be present together.

Regression risks:
- Do not change the legacy fallback payload unless tests show it is affected.
- Do not remove the existing recipient transfer capability; transfers are still
  required for payout routing.

## Implemented Accounts v2 Capability Dependency Fix (2026-06-17)

- `StripeV2CoreAccountCreateParams.configuration` now includes
  `merchant.capabilities.card_payments.requested = true`.
- `buildConnectedAccountCreateParams()` sends that merchant capability alongside
  the existing recipient `stripe_balance.stripe_transfers` capability.
- The Accounts v2 `include` list now requests `configuration.merchant`,
  `configuration.recipient`, and `defaults`.
- Legacy fallback account creation is unchanged.

Verification:
- RED focused test failed before the production change because
  `configuration.merchant` was missing.
- GREEN focused test passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/stripe/stripe-payout-gateway.test.ts`
  with 6 tests.
- Web typecheck passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web lint`.

## Change History
| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Implemented Accounts v2 merchant `card_payments` dependency fix. | Codex |
| 2026-06-17 | Planned Accounts v2 merchant `card_payments` dependency fix for recipient `stripe_transfers`. | Codex |
| 2026-06-17 | Centralized payout country into one `PAYOUT_COUNTRY` constant; documented US-only scope + deferred international plan. | Claude |
| 2026-06-17 | Added Accounts v2 `identity.country` after Stripe returned `identity_country_required`. | Codex |
| 2026-06-17 | Planned Accounts v2 identity country fix after Stripe returned `identity_country_required`. | Codex |
| 2026-06-17 | Implemented Accounts v2 unavailable fallback and documented real Stripe Connect platform blocker. | Codex |
| 2026-06-17 | Planned v2 payload correction and v1 Express fallback after real Stripe Connect smoke failure. | Codex |
| 2026-06-15 | Removed unsupported `metadata` from Accounts v2 create payload. | Codex |
| 2026-06-15 | Planned removal of unsupported `metadata` from Accounts v2 create payload. | Codex |
| 2026-06-15 | Implemented raw Accounts v2 recipient account creation for Stripe payout onboarding. | Codex |
| 2026-06-15 | Planned migration of new payout account creation to Accounts v2 recipient configuration. | Codex |
| 2026-06-15 | Documented Stripe API version and controller-based Connect account fix. | Codex |
| 2026-06-14 | Created | Kiro |
