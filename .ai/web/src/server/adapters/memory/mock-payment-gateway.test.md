# mock-payment-gateway.test.ts

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Unit tests for the credential-free mock payment gateway.

## Planned Test 2026-06-16

Mock checkout should simulate Stripe's `{CHECKOUT_SESSION_ID}` success-url
placeholder replacement. This keeps localhost redirect behavior useful for
diagnosing webhook/pending-payment flows.

## Implemented Test

Added coverage in `memory-adapters.test.ts` because this gateway already has
adapter-level tests there. The test asserts the mock session id is substituted
into the returned URL.

## Verification

- Red focused run failed because the returned URL contained the literal
  `{CHECKOUT_SESSION_ID}` placeholder.
- Green focused run passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/memory/memory-adapters.test.ts src/app/api/advertiser-checkout/route.test.ts src/app/api/funds/checkout/route.test.ts`.
- Full regression passed:
  `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented mock checkout placeholder replacement regression test. | Codex |
| 2026-06-16 | Planned mock checkout session placeholder replacement regression test. | Codex |
