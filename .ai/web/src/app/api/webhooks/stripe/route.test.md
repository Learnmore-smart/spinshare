# route.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Tests Stripe webhook funding behavior and idempotency.

## Existing Coverage

- Verified `checkout.session.completed` credits campaign budget once.
- Redelivered event ids are idempotent.
- Bad signatures return `400` with no mutation.

## Planned Change 2026-06-15 Advertiser Money Events

Add failing coverage that a newly applied funding event records one
`budgetFunded` advertiser activity row, and that duplicate webhook redelivery
does not create another activity row.

## Implemented Coverage 2026-06-15 Advertiser Money Events

The webhook test now verifies that two deliveries of the same verified funding
event produce exactly one `budgetFunded` activity row.

## Planned Coverage 2026-06-16 Funding Event Validation And Session Traceability

Add regression coverage that:

- a verified funding event for a missing campaign returns a retryable error and
  does not mark the Stripe event as applied;
- a newly applied funding event with a Checkout Session id records that
  `checkoutSessionId` on the `budgetFunded` advertiser activity row.

## Implemented Coverage 2026-06-16 Funding Event Validation And Session Traceability

The route test now covers both planned cases. The missing-campaign case failed
before implementation because the route threw from `applyBudgetDeltaCents()`
after claiming the payment event. The checkout-session activity case failed
because the activity row did not include `checkoutSessionId`.

## Planned Coverage 2026-06-20 Delivery Inventory

Assert verified funding credits exact purchased impressions once, redelivery
does not double-credit, and legacy events infer only exact whole blocks.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Planned webhook purchased-inventory and idempotency coverage. | Codex |
| 2026-06-16 | Implemented missing-campaign and checkout-session webhook coverage. | Codex |
| 2026-06-16 | Planned missing-campaign and checkout-session webhook coverage. | Codex |
| 2026-06-15 | Implemented funding activity test coverage. | Codex |
| 2026-06-15 | Created doc before adding funding activity tests. | Codex |
