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

## Planned Change

Pass optional `customer_email` to Stripe Checkout when the public homepage form supplies an email.

## Implemented Change

`StripeGateway.createCheckoutSession()` passes `customer_email` when `CheckoutInput.customerEmail` is provided.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created doc before wiring checkout customer email. | Codex |
| 2026-06-13 | Synced doc with Stripe customer email pass-through. | Codex |
