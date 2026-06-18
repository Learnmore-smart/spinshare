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

## Planned Change 2026-06-16 Funding Event Validation And Session Traceability

Two webhook risks remain in the post-checkout visibility path:

- If a verified `checkout.session.completed` references a campaign that cannot
  be loaded, the route currently claims the Stripe event before attempting the
  budget increment. If the increment then fails, the event may be marked applied
  without funding the campaign, making a paid checkout stay off the leaderboard.
- The route records `budgetFunded` activity with the Stripe event id but not the
  Checkout Session id. The success URL carries `checkout_session_id=cs_...`, so
  keeping that id in funded activity is necessary for post-checkout diagnostics.

Fix strategy:

- Validate the funding event before claiming it: positive amount, non-empty
  campaign id, and campaign exists.
- If the campaign cannot be loaded, return a retryable server error and do not
  mark the payment event as applied.
- Carry the Checkout Session id from the parsed payment event into
  `budgetFunded` activity when available.

Regression tests should cover missing-campaign events not being marked applied
and checkout session id persistence on funded activity.

## Implemented Change 2026-06-16 Funding Event Validation And Session Traceability

The webhook now validates funding events before claiming the Stripe event:

- non-positive amounts or empty campaign ids are acknowledged as ignored without
  mutation;
- missing campaigns return `500` and do not mark the event applied, preserving
  Stripe retry/manual replay possibilities;
- existing campaigns are loaded before `markApplied()`, and the loaded campaign
  supplies the advertiser id for activity history;
- `budgetFunded` activity includes `checkoutSessionId` when the gateway parsed
  it from the Checkout Session.

## Planned Change 2026-06-16 Checkout Session Idempotency Key

To support safe post-return reconciliation from `/api/checkout-status`, use the
Checkout Session id as the idempotency key when a funding event carries
`checkoutSessionId`: `checkout_session:{sessionId}`. Keep the Stripe event id as
the fallback key for events without a session id.

This lets the webhook and the checkout-status fallback share the same
idempotency record and prevents double-credit when the user returns before the
webhook arrives.

## Implemented Change 2026-06-16 Checkout Session Idempotency Key

Webhook funding now claims `checkout_session:{checkoutSessionId}` when the
parsed Stripe event includes a Checkout Session id, falling back to the Stripe
event id only when no session id is available. Activity rows still retain the
Stripe provider event id.

## Verification 2026-06-16 Funding Event Validation And Session Traceability

- Red focused webhook run failed because a missing campaign threw after the
  payment event was already marked, and funded activity lacked
  `checkoutSessionId`.
- Green focused webhook/gateway run passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/webhooks/stripe/route.test.ts src/server/adapters/stripe/stripe-gateway.test.ts`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented shared Checkout Session idempotency key. | Codex |
| 2026-06-16 | Planned shared Checkout Session idempotency key. | Codex |
| 2026-06-16 | Implemented funding event validation and checkout session traceability. | Codex |
| 2026-06-16 | Planned funding event validation and checkout session traceability. | Codex |
| 2026-06-15 | Implemented funding activity events for Stripe webhook. | Codex |
| 2026-06-15 | Created doc before adding funding activity events. | Codex |
