# route.ts

> Last updated: 2026-06-15 | Protection: PROTECTED

## Purpose

Starts or resumes Stripe Connect payout onboarding for the signed-in developer.

## What It Does

- Requires a same-origin browser-session POST.
- Loads the signed-in developer and existing connected account id.
- Ensures a connected account exists, persists it, and returns a Stripe onboarding URL.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `POST` | Route handler | Returns `{ url }` or an error JSON response. |

## Dependencies

- Internal: NextAuth session adapter, container users/payouts, CSRF helper.
- External: Stripe through `PayoutGateway`.

## Important Notes / NEVER Change

- Never create a connected account for an unauthenticated or cross-origin request.
- Do not leak Stripe secret keys, raw headers, or account secrets in error responses.
- Preserve idempotent reuse of an existing connected account id.

## Planned Fix

Bug: Stripe invalid-request errors bubble out as HTTP 500, so the UI only shows a generic retry message and logs an opaque Stripe error.

Fix: catch provider errors after authentication/CSRF, log a sanitized server-side message, and return a non-secret JSON error with status 502 for Connect provider failures.

## Planned Route Regression Test

Add a mocked route test proving provider failures return sanitized `502` JSON with request id/status details and no raw Stripe headers or secrets.

## Implemented Route Regression

`route.test.ts` now covers both onboarding URL success and sanitized provider failure behavior.

## Planned Fix 2026-06-17

Bug: the Stripe platform-not-enabled case is returned as a generic provider rejection, even though the provider message is a known operational blocker: `You can only create new accounts if you've signed up for Connect`.

Fix: detect that known Stripe message, return a non-secret `reason: "stripe_connect_not_enabled"` and clearer user-facing message, while preserving request id/status/code fields for Stripe log lookup.

## Implemented Fix 2026-06-17

`providerFailureBody()` now maps known Connect setup blocker codes/messages to `reason: "stripe_connect_not_enabled"` with a clearer non-secret message. Generic provider failures still return the sanitized request id/status/code shape.

## Planned Fix 2026-06-17 Minimum Gate

Product requirement: do not make developers connect Stripe before they have
earned the $5 payout minimum. This route currently creates/reuses a connected
account and returns onboarding for any signed-in developer, even with a $0
balance.

Fix:
- Flush pending ledger work before reading the durable balance.
- If `balanceCents < MINIMUM_PAYOUT_CENTS`, return `422` with
  `error: "below_minimum"` and do not call Stripe.
- Keep CSRF/session checks before the balance read.
- Keep provider error sanitization unchanged for eligible users.

## Implemented Fix 2026-06-17 Minimum Gate

- `POST /api/payouts/connect` now flushes pending ledger work before reading the
  developer's durable balance.
- Below the $5 minimum it returns `422` with `error`, `balanceCents`, and
  `minimumCents`.
- The below-minimum path returns before `ensureConnectedAccount()`,
  `createOnboardingLink()`, or `setConnectAccount()`, so no Stripe account is
  created.

Verification:
- RED route test returned `502` before implementation because the route still
  fell through to the provider path.
- GREEN route test passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/payouts/connect/route.test.ts`
  with 4 tests.
- Web typecheck passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web lint`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Onboarding minimum gate now resolves to $10.00 (`MINIMUM_PAYOUT_CENTS` raised 500→1000). Connect remains available; only cash-out is disabled. | Cursor |
| 2026-06-17 | Implemented server-side $5 minimum gate for Stripe Connect onboarding. | Codex |
| 2026-06-17 | Planned server-side $5 minimum gate for Stripe Connect onboarding. | Codex |
| 2026-06-17 | Implemented known Connect-not-enabled response mapping. | Codex |
| 2026-06-17 | Planned known Connect-not-enabled response mapping. | Codex |
| 2026-06-15 | Synced docs after adding payout Connect route regression tests. | Codex |
| 2026-06-15 | Planned route-level regression test for sanitized provider failures. | Codex |
| 2026-06-15 | Created doc and documented Connect error handling fix. | Codex |
