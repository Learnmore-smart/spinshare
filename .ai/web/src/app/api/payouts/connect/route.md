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

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Synced docs after adding payout Connect route regression tests. | Codex |
| 2026-06-15 | Planned route-level regression test for sanitized provider failures. | Codex |
| 2026-06-15 | Created doc and documented Connect error handling fix. | Codex |
