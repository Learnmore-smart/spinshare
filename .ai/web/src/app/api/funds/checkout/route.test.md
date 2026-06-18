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

## Planned Coverage 2026-06-16 Same-Email Public Campaign Funding

Add a regression test where the campaign is owned by
`publicAdvertiserIdForEmail("buyer@example.com")` and the dashboard bearer token
belongs to a different OAuth user id but carries `email: "Buyer@Example.com"`.
The route should authorize funding because this is the same homepage buyer
claim model used by `/api/campaigns`.

## Implemented Coverage 2026-06-16 Same-Email Public Campaign Funding

The regression test is implemented. It first failed with `403` under the old
single-`userId` ownership check, then passed after `/api/funds/checkout` allowed
the same-email public advertiser id as an authorized owner.

## Planned Coverage 2026-06-18 Buy-Time CPM

Add RED coverage for optional `cpmCents` in dashboard funding:

- omitting `cpmCents` preserves the campaign's current CPM and derives amount
  from that stored value
- providing `cpmCents` persists the new max CPM and derives this checkout's
  amount from the new value
- invalid CPM values are rejected before budget mutation

## Implemented Coverage 2026-06-18 Buy-Time CPM

Added coverage for omitted CPM preserving the stored CPM, provided CPM updating
the campaign and checkout amount, and invalid CPM rejection before mutation.

Verification:
`corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts src/app/api/funds/checkout/route.test.ts`
passed 19 tests.

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
| 2026-06-18 | Implemented buy-time CPM checkout coverage. | Codex |
| 2026-06-18 | Planned buy-time CPM checkout coverage. | Codex |
| 2026-06-16 | Implemented same-email public campaign funding regression test. | Codex |
| 2026-06-16 | Planned same-email public campaign funding regression test. | Codex |
| 2026-06-15 | Added dashboard checkout money activity event coverage. | Codex |
| 2026-06-15 | Added funds checkout route tests. | Codex |
| 2026-06-15 | Created test doc before adding route tests. | Codex |
