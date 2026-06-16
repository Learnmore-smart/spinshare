# stripe-gateway.test.ts

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Tests Stripe SDK gateway behavior that can be verified locally without making
network calls.

## Planned Coverage 2026-06-16 Checkout Session Traceability

Add coverage for `verifyAndParseWebhook()` using a locally signed Stripe test
webhook payload. The test should prove that a `checkout.session.completed`
event returns:

- Stripe event id as the idempotency key;
- Checkout Session id as `checkoutSessionId`;
- campaign id from metadata;
- amount in integer cents.

## Implemented Coverage 2026-06-16 Checkout Session Traceability

`stripe-gateway.test.ts` signs a local `checkout.session.completed` payload
with `Stripe.webhooks.generateTestHeaderString()` and verifies that
`StripeGateway.verifyAndParseWebhook()` returns event id, event type,
`checkoutSessionId`, campaign id, and amount cents without making network calls.

## Dependencies

- `stripe`
- `web/src/server/adapters/stripe/stripe-gateway.ts`

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented checkout session id parse coverage. | Codex |
| 2026-06-16 | Planned checkout session id parse coverage. | Codex |
