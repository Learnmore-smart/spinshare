# route.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Regression tests for the payout Connect HTTP route.

## What It Does

- Mocks the browser session and container dependencies.
- Verifies successful onboarding returns a Stripe URL and persists the account id.
- Verifies provider failures return sanitized `502` JSON instead of an opaque `500`.

## Public API

| Name | Type | Description |
|------|------|-------------|
| Vitest suite | Test file | Exercises `POST /api/payouts/connect` route behavior. |

## Dependencies

- Internal: `./route`.
- External: Vitest.

## Important Notes / NEVER Change

- Do not use real Stripe keys or create real connected accounts in this test.
- Keep assertions focused on HTTP behavior and sanitized error shape.

## Planned Test

Add route-level regression coverage for the generic 500 reported by the user: a provider error carrying `requestId` and `statusCode` must become a non-secret `502` response body with `error: "payout_connect_failed"`.

## Implemented Test

- Happy path returns the onboarding URL and persists the connected account id.
- Provider failure path returns sanitized `502` JSON with request id, provider status, and provider code while excluding raw headers/secrets.

## Planned Test 2026-06-17

Add a regression for the known Stripe Connect setup blocker so the route returns `reason: "stripe_connect_not_enabled"` instead of only the generic provider rejection message.

## Implemented Test 2026-06-17

The route test now covers a provider error carrying `platform_registration_required` and verifies the response includes `reason: "stripe_connect_not_enabled"`, the actionable message, request id, status, and provider code.

## Planned Test 2026-06-17 Minimum Gate

Add a route regression proving a signed-in developer below the $5 minimum gets
`422 { error: "below_minimum" }` and the route does not call
`ensureConnectedAccount()` or `createOnboardingLink()`.

## Implemented Test 2026-06-17 Minimum Gate

Added a below-minimum route test that verifies:
- response status is `422`;
- body includes `error: "below_minimum"`, current balance, and minimum;
- pending ledger work is flushed before reading;
- Stripe account/onboarding side effects are not called.

Verification:
- RED run returned `502` before implementation.
- GREEN run passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/payouts/connect/route.test.ts`
  with 4 tests.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Added below-minimum Connect route regression. | Codex |
| 2026-06-17 | Planned below-minimum Connect route regression. | Codex |
| 2026-06-17 | Added Connect-not-enabled mapping regression. | Codex |
| 2026-06-17 | Planned Connect-not-enabled mapping regression. | Codex |
| 2026-06-15 | Added mocked route tests for payout Connect success and provider failure. | Codex |
| 2026-06-15 | Created payout connect route test documentation. | Codex |
