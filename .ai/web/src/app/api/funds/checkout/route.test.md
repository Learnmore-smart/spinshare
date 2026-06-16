# route.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Tests `/api/funds/checkout` dashboard campaign funding behavior.

## Planned Coverage

- Authorized campaign owner can create a checkout session.
- The route passes success/cancel URLs to the payment gateway.
- Mock checkout settles immediately and updates campaign budget.
- Non-owner requests are rejected before any payment session is created.
- Missing campaigns return not found.

## Implemented Coverage

All planned cases are covered in `web/src/app/api/funds/checkout/route.test.ts`.

## Implemented Change 2026-06-15 Advertiser Money Events

The owner funding test now verifies `checkoutStarted` and `budgetFunded`
advertiser activity rows are recorded for settled mock checkouts.

## Dependencies

- `web/src/app/api/funds/checkout/route.ts`
- memory container adapters
- mock auth provider

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Added dashboard checkout money activity event coverage. | Codex |
| 2026-06-15 | Added funds checkout route tests. | Codex |
| 2026-06-15 | Created test doc before adding route tests. | Codex |
