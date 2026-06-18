# stripe-payout-gateway.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Unit tests for Stripe payout gateway request construction.

## What It Does

- Verifies connected account creation uses explicit controller properties for Express onboarding.
- Verifies the gateway avoids legacy account `type` in new account create params.
- Verifies transfer and onboarding calls keep using the narrow payout port contract.

## Dependencies

- Internal: `stripe-payout-gateway.ts`.
- External: Vitest.

## Planned Test

Add red coverage for controller-based connected account creation before changing the production gateway.

## Planned Accounts v2 Test Update

Change the request-shape test to require Accounts v2 recipient configuration, `dashboard = "express"`, and no legacy `type`, `capabilities.transfers`, or `controller` payload.

## Implemented Test Coverage

- Locks the Accounts v2 recipient payload shape.
- Verifies `createConnectedAccount` posts to `/v2/core/accounts` with the pinned Stripe API version and serialized payload.
- Verifies the payload excludes unsupported legacy/v1 fields and unsupported Accounts v2 create metadata.

## Planned Connect Smoke Regression Tests (2026-06-17)

Real Stripe smoke showed the gateway needs stricter request-shape coverage:
- Accounts v2 params must exclude `defaults.responsibilities.requirements_collector`.
- Legacy fallback params must use controller-based Express fields, not `type: "express"`.
- Accounts v2 fallback detection must only match known v2-unavailable signals, not arbitrary validation failures.

## Implemented Connect Smoke Regression Tests (2026-06-17)

- The Accounts v2 payload test now asserts that `requirements_collector` is absent.
- Added coverage for `buildLegacyConnectedAccountCreateParams()`:
  controller-based Express account, platform-paid fees/losses, requested transfers capability, no legacy `type`, no metadata.
- Added coverage for `isAccountsV2UnavailableError()`:
  true for `non_connect_platform_accounts_v2_access_blocked` and the Accounts v2 404 unavailable message; false for generic invalid field errors.

Verification:
- RED run failed for the expected reasons:
  unsupported `requirements_collector` still present and fallback helpers missing.
- GREEN run passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/stripe/stripe-payout-gateway.test.ts`
  with 5 tests.

## Planned Identity Country Regression (2026-06-17)

Runtime Stripe returned `identity_country_required` for Accounts v2 recipient account creation. Add coverage requiring the create payload to include `identity.country = "us"` while still avoiding legacy v1 account fields.

## Implemented Identity Country Regression (2026-06-17)

The Accounts v2 payload test now requires `identity.country = "us"`.

## Single-Source Country Invariant (2026-06-17)

After centralizing the payout country into one `PAYOUT_COUNTRY` constant, added a
test asserting the v2 and legacy builders never drift: the v2 `identity.country`
equals the legacy `country` lowercased, and both equal `"us"`. Guards against a
future edit that changes one path's country but not the other.

Verification (6 tests):
`corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/stripe/stripe-payout-gateway.test.ts`.

## Planned Accounts v2 Capability Dependency Regression (2026-06-17)

Runtime Stripe returned `capability_not_available_without_other_capability`
because the Accounts v2 payload requested recipient
`stripe_balance.stripe_transfers` without merchant `card_payments`.

Test plan:
- Extend the Accounts v2 payload shape test to require
  `configuration.merchant.capabilities.card_payments.requested = true`.
- Require the `include` list to contain both `configuration.merchant` and
  `configuration.recipient`.
- Verify the test fails before changing production code and passes after the
  payload builder is updated.

## Implemented Accounts v2 Capability Dependency Regression (2026-06-17)

- The Accounts v2 payload shape test now requires merchant
  `card_payments.requested = true`.
- The same test requires the include list to return
  `configuration.merchant`, `configuration.recipient`, and `defaults`.

Verification:
- RED run failed on the missing `configuration.merchant` object.
- GREEN run passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/stripe/stripe-payout-gateway.test.ts`
  with 6 tests.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Added regression requiring merchant `card_payments` and merchant include in Accounts v2 payload. | Codex |
| 2026-06-17 | Planned regression for Accounts v2 merchant `card_payments` dependency. | Codex |
| 2026-06-17 | Added single-source country invariant test (v2 vs legacy builders agree). | Claude |
| 2026-06-17 | Added Accounts v2 identity country regression. | Codex |
| 2026-06-17 | Planned Accounts v2 identity country regression. | Codex |
| 2026-06-17 | Added regression tests for Accounts v2 invalid field removal and v2 unavailable fallback. | Codex |
| 2026-06-17 | Planned regression tests for Accounts v2 invalid field removal and v2-unavailable fallback. | Codex |
| 2026-06-15 | Added assertion that Accounts v2 create payload excludes metadata. | Codex |
| 2026-06-15 | Planned assertion that Accounts v2 create payload excludes metadata. | Codex |
| 2026-06-15 | Added Accounts v2 raw request test coverage. | Codex |
| 2026-06-15 | Update payout gateway tests to lock the Accounts v2 recipient payload. | Codex |
| 2026-06-15 | Created doc for payout gateway tests. | Codex |
