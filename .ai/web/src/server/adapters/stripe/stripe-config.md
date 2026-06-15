# stripe-config.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Shared Stripe SDK configuration for web payment and payout adapters.

## What It Does

- Exports the Stripe API version the app pins for SDK requests.
- Provides a helper for constructing Stripe clients without touching credentials at import time.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `STRIPE_API_VERSION` | Constant | Current pinned Stripe API version. |
| `createStripeClient` | Function | Creates a Stripe SDK client for a provided secret key. |

## Dependencies

- External: `stripe`.

## Important Notes / NEVER Change

- Do not read `process.env` in this file.
- Keep client creation explicit so adapters stay lazy and build-safe.

## Planned Change

Centralize Stripe API version pinning. The current docs and Stripe response header identify `2026-05-27.dahlia` as current, while the installed SDK defaults to `2025-02-24.acacia`.

## Planned Accounts v2 Support

Expose the Stripe API base URL next to the pinned version so raw Accounts v2 calls use the same version constants as SDK-backed calls.

## Implemented Accounts v2 Support

`STRIPE_API_BASE_URL` is exported for raw `/v2/core/accounts` calls.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Exported Stripe API base URL for raw Accounts v2 calls. | Codex |
| 2026-06-15 | Planned shared API base URL for raw Accounts v2 calls. | Codex |
| 2026-06-15 | Created doc for shared Stripe config helper. | Codex |
