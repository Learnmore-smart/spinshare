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

## Planned Change 2026-06-16 Checkout Session Funding Lookup

Implement `retrieveCheckoutSessionFunding(sessionId)` by retrieving the Stripe
Checkout Session from the API and projecting it to the narrow payment gateway
funding view. Only the method call should touch Stripe; construction/import must
remain credential-tolerant.

The pure projection should be covered without network calls so tests can verify
metadata campaign id, fallback `client_reference_id`, `payment_status`, and
`amount_total` behavior locally.

## Implemented Change 2026-06-16 Checkout Session Funding Lookup

Added `stripeCheckoutSessionToFunding()` for pure projection and
`StripeGateway.retrieveCheckoutSessionFunding(sessionId)` for live Stripe
retrieval. The method catches retrieval errors and returns `null` so
checkout-status diagnostics degrade back to `pending_webhook` instead of
crashing.

## Implemented Change 2026-06-20 Purchased Inventory Metadata

Write exact purchased impressions to Stripe Checkout metadata and safely parse
that positive integer from completed webhook sessions and retrieved Checkout
Sessions. Missing or malformed legacy metadata stays absent for strict
settlement fallback; no network behavior or credential loading changes.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Implemented Stripe purchased-inventory metadata transport. | Codex |
| 2026-06-16 | Implemented Checkout Session funding lookup. | Codex |
| 2026-06-16 | Planned Checkout Session funding lookup. | Codex |
| 2026-06-16 | Implemented parsed Checkout Session id preservation. | Codex |
| 2026-06-16 | Planned parsed Checkout Session id preservation. | Codex |
| 2026-06-15 | Documented shared Stripe API-version client plan. | Codex |
| 2026-06-13 | Created doc before wiring checkout customer email. | Codex |
| 2026-06-13 | Synced doc with Stripe customer email pass-through. | Codex |
