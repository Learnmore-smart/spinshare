# route.ts

> Last updated: 2026-06-15 | Protection: CRITICAL

## Purpose

Stripe webhook receiver that applies confirmed campaign funding exactly once.

## What It Does

- Reads the raw request body and Stripe signature header.
- Verifies/parses the webhook via the configured payment gateway.
- Claims `checkout.session.completed` events through `PaymentEventStore`.
- Applies campaign budget only for the first verified delivery.
- Acknowledges verified duplicates without applying budget again.

## Important Notes / NEVER Change

- Never parse the body with `request.json()` before signature verification.
- Never apply campaign budget before claiming the payment event idempotency key.
- Invalid signatures must return `400` without mutation.
- Verified duplicate events must return `200` without another budget increment.

## Planned Change 2026-06-15 Advertiser Money Events

After a funding event is newly applied, record a best-effort advertiser activity
event with status `budgetFunded`, the funded campaign id, Stripe event id, and
funding amount. Duplicate deliveries must not create duplicate activity rows.
Activity failures must not affect Stripe webhook acknowledgement.

## Implemented Change 2026-06-15 Advertiser Money Events

Newly applied `checkout.session.completed` events now write one best-effort
`budgetFunded` advertiser activity row keyed as `payment_{stripeEventId}`.
The row includes campaign id, advertiser id when the campaign can be loaded,
funding amount, USD display amount, and provider event id. Duplicate Stripe
deliveries skip both budget mutation and duplicate activity creation.

## Verification 2026-06-15

- Red focused webhook test failed because no advertiser activity row was
  recorded.
- Green focused web run passed for webhook/activity/checkout/track/feed tests.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented funding activity events for Stripe webhook. | Codex |
| 2026-06-15 | Created doc before adding funding activity events. | Codex |
