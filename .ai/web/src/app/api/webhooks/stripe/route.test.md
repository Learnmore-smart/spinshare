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

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented funding activity test coverage. | Codex |
| 2026-06-15 | Created doc before adding funding activity tests. | Codex |
