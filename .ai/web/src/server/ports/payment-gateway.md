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

## Planned Change 2026-06-16 Checkout Session Traceability

Add optional `checkoutSessionId` to parsed `StripeEvent` values. Stripe
webhook event ids (`evt_...`) are idempotency keys, but the browser success URL
contains the Checkout Session id (`cs_...`). Preserving both ids lets activity
history and future post-checkout diagnostics connect a redirect back to the
confirmed funding event.

## Implemented Change 2026-06-16 Checkout Session Traceability

`StripeEvent` now has optional `checkoutSessionId`. It is populated by adapters
when the verified webhook came from a Checkout Session and left absent for other
event types or old mock payloads.

## Planned Change 2026-06-16 Checkout Session Funding Lookup

Add a gateway method for post-return diagnostics:
`retrieveCheckoutSessionFunding(sessionId)`. It should return a narrow,
provider-verified funding view for a Checkout Session:

- session id;
- payment status (`paid` or `unpaid`);
- campaign id from metadata / client reference id;
- amount in integer cents.

The method is used only as a fallback/diagnostic after a checkout success
redirect, not as a replacement for Stripe webhooks. Routes must still guard
funding with idempotency.

## Implemented Change 2026-06-16 Checkout Session Funding Lookup

Added `CheckoutSessionFunding` and
`PaymentGateway.retrieveCheckoutSessionFunding(sessionId)`. The method returns
`null` when a session cannot be retrieved; callers decide whether/how to
reconcile funding and must keep idempotency outside the gateway.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented Checkout Session funding lookup on payment gateway port. | Codex |
| 2026-06-16 | Planned Checkout Session funding lookup on payment gateway port. | Codex |
| 2026-06-16 | Implemented optional parsed checkout session id on Stripe events. | Codex |
| 2026-06-16 | Planned optional parsed checkout session id on Stripe events. | Codex |
| 2026-06-15 | Documented optional immediate-settlement checkout result. | Codex |
| 2026-06-13 | Created doc before adding checkout customer email support. | Codex |
| 2026-06-13 | Synced doc with checkout customer email field. | Codex |
