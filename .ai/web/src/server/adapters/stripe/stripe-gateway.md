# stripe-gateway.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Stripe SDK-backed payment gateway implementation.

## What It Does

- Lazily initializes Stripe using `STRIPE_SECRET_KEY`.
- Creates hosted checkout sessions for campaign funding.
- Verifies Stripe webhook signatures and extracts campaign funding events.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `StripeGateway` | Class | Production/test Stripe implementation of `PaymentGateway`. |

## Dependencies

- External: `stripe`.
- Internal: payment gateway port.

## Important Notes / NEVER Change

- Do not touch Stripe credentials at import time.
- Keep campaign id in checkout metadata so the webhook can fund the correct campaign.
- Keep real Stripe checkout webhook-settled; do not mark Stripe sessions as immediately settled.

## Planned Change (2026-06-15)

Use the shared Stripe client factory so Checkout requests are pinned to the current API version (`2026-05-27.dahlia`) while preserving lazy credential loading.

## Planned Change

Pass optional `customer_email` to Stripe Checkout when the public homepage form supplies an email.

## Implemented Change

`StripeGateway.createCheckoutSession()` passes `customer_email` when `CheckoutInput.customerEmail` is provided.

## Planned Change 2026-06-16 Checkout Session Traceability

When parsing `checkout.session.completed`, preserve the Stripe Checkout Session
id (`session.id`) alongside the event id. The event id remains the idempotency
key; the session id is for user-facing diagnostics and activity correlation.

## Implemented Change 2026-06-16 Checkout Session Traceability

`StripeGateway.toStripeEvent()` now returns `checkoutSessionId: session.id` for
`checkout.session.completed` events while keeping `event.id` as the idempotency
key.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented parsed Checkout Session id preservation. | Codex |
| 2026-06-16 | Planned parsed Checkout Session id preservation. | Codex |
| 2026-06-15 | Documented shared Stripe API-version client plan. | Codex |
| 2026-06-13 | Created doc before wiring checkout customer email. | Codex |
| 2026-06-13 | Synced doc with Stripe customer email pass-through. | Codex |
