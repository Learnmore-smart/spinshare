# mock-payment-gateway.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Credential-free local/test implementation of the payment gateway port.

## What It Does

- Creates deterministic mock checkout sessions.
- Verifies deterministic HMAC-signed mock webhook payloads.
- Provides test helpers for signed mock Stripe events.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `MockPaymentGateway` | Class | Local/test `PaymentGateway` implementation. |

## Dependencies

- Internal: payment gateway port and id generator.
- External: Node `crypto`.

## Important Notes / NEVER Change

- Must remain credential-free.
- Must never call Stripe or the network.
- Mock checkout may simulate immediate settlement, but real Stripe checkout must remain webhook-settled.

## Planned Fix

Bug: homepage public checkout returns `200` locally but the campaign stays hidden after reload.

Cause: mock checkout creates a zero-budget campaign and a fake checkout URL, but no webhook ever credits the campaign budget.

Fix: mark mock checkout sessions as immediately settled and have the public checkout route credit the campaign budget only when the payment gateway returns that explicit marker.

## Planned Change 2026-06-16

Stripe replaces `{CHECKOUT_SESSION_ID}` in `success_url` after hosted checkout
completion. The mock gateway should replace the same placeholder with the mock
session id so local redirect URLs carry the session context too.

## Implemented Change 2026-06-16

`createCheckoutSession()` now replaces every `{CHECKOUT_SESSION_ID}` occurrence
in the provided success URL with the generated mock `sessionId`.

## Implemented Change 2026-06-16 Webhook Checkout Session Traceability

`verifyAndParseWebhook()` now preserves optional `checkoutSessionId` from signed
mock webhook payloads. This keeps mock webhook tests aligned with Stripe's real
`checkout.session.completed` parsing, where the event id and Checkout Session
id are distinct.

## Planned Change 2026-06-16 Checkout Session Funding Lookup

Implement the new payment gateway lookup method without network calls. The mock
gateway should remember sessions it created and return a paid funding view for
them because mock checkouts are immediately settled. Unknown sessions should
return `null`.

## Implemented Change 2026-06-16 Checkout Session Funding Lookup

`MockPaymentGateway` now records each created mock Checkout Session and returns
a paid `CheckoutSessionFunding` view from `retrieveCheckoutSessionFunding()`.
Unknown sessions return `null`.

## Planned Change 2026-06-20 Purchased Inventory Metadata

Store `CheckoutInput.purchasedImpressions` in the mock session funding view and
preserve optional purchased inventory when coercing signed webhook payloads.
This keeps credential-free settlement behavior identical to Stripe metadata.

## Verification

- Red focused run failed because mock checkout returned the literal placeholder.
- Green focused run passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/memory/memory-adapters.test.ts src/app/api/advertiser-checkout/route.test.ts src/app/api/funds/checkout/route.test.ts`.
- Full regression passed:
  `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Planned purchased-inventory transport through mock sessions/events. | Codex |
| 2026-06-16 | Implemented mock Checkout Session funding lookup. | Codex |
| 2026-06-16 | Planned mock Checkout Session funding lookup. | Codex |
| 2026-06-16 | Preserved optional checkout session id in mock webhook parsing. | Codex |
| 2026-06-16 | Implemented mock checkout success URL session-id replacement. | Codex |
| 2026-06-16 | Planned mock checkout success URL session-id replacement. | Codex |
| 2026-06-15 | Created doc and documented mock settlement fix. | Codex |
