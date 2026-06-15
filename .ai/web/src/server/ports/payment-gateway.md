# payment-gateway.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Defines the payment gateway port for Stripe checkout and webhook verification.

## What It Does

- Creates hosted checkout sessions for campaign funding.
- Verifies and parses Stripe webhook events into the narrow app event shape.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `CheckoutInput` | Interface | Input for creating a hosted checkout session. |
| `PaymentGateway` | Interface | Checkout and webhook verification operations. |

## Dependencies

- None directly; concrete adapters depend on Stripe or mocks.

## Important Notes / NEVER Change

- Webhook parsing must keep campaign id and amount available for idempotent funding.
- Checkout input should remain adapter-agnostic.
- Immediate settlement is optional and only for credential-free mock/local gateways; real Stripe checkout must remain webhook-settled.

## Planned Change (2026-06-15)

Add an optional checkout result marker that lets local/mock gateways say a checkout is already settled. Routes can use that to simulate a completed payment without guessing from URL strings or env flags.

## Planned Change

Add optional `customerEmail` so the public checkout route can pass the homepage email field through to Stripe Checkout.

## Implemented Change

`CheckoutInput` now includes optional `customerEmail`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Documented optional immediate-settlement checkout result. | Codex |
| 2026-06-13 | Created doc before adding checkout customer email support. | Codex |
| 2026-06-13 | Synced doc with checkout customer email field. | Codex |
