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

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Added mocked route tests for payout Connect success and provider failure. | Codex |
| 2026-06-15 | Created payout connect route test documentation. | Codex |
