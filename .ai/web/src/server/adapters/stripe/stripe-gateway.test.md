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

## Planned Coverage 2026-06-16 Checkout Session Funding Lookup

Add pure projection coverage before implementation:

- a paid Checkout Session with metadata campaign id maps to paid funding;
- a paid Checkout Session without metadata falls back to `client_reference_id`;
- an open/unpaid session maps to unpaid without applying funding semantics.

## Implemented Coverage 2026-06-16 Checkout Session Funding Lookup

Added local pure projection tests for paid metadata mapping and unpaid
client-reference fallback mapping. These tests do not call the Stripe network.

## Planned Coverage 2026-06-20 Purchased Inventory Metadata

Add local projection assertions for valid `purchasedImpressions` metadata and
malformed/missing legacy values. Extend the signed completed-session test to
prove webhook projection preserves the same exact count.

## Dependencies

- `stripe`
- `web/src/server/adapters/stripe/stripe-gateway.ts`

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Planned purchased-inventory Stripe metadata coverage. | Codex |
| 2026-06-16 | Implemented Checkout Session funding lookup coverage. | Codex |
| 2026-06-16 | Planned Checkout Session funding lookup coverage. | Codex |
| 2026-06-16 | Implemented checkout session id parse coverage. | Codex |
| 2026-06-16 | Planned checkout session id parse coverage. | Codex |
