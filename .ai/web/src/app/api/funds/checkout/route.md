# route.ts

> Last updated: 2026-06-15 | Protection: CRITICAL

## Purpose

Starts a checkout session to add budget to an existing advertiser campaign.

## Current Problem

The route authenticates a bearer token and validates `{ campaignId, amountCents }`, but it does not currently prove that the campaign belongs to the authenticated advertiser. It also creates a checkout session without explicit success/cancel URLs, so dashboard funding does not behave as consistently as homepage checkout.

## Planned Change

- Load the campaign before creating checkout.
- Return `404` when the campaign does not exist.
- Return `403` when the authenticated advertiser does not own the campaign.
- Pass dashboard success/cancel URLs into `payments.createCheckoutSession`.
- If the payment gateway is mock/settled, apply the budget delta immediately and return updated budget metadata for tests/local mode.

## Test Plan

- Add `route.test.ts` first.
- Verify the new tests fail before implementation.
- Run the targeted funds checkout route tests after implementation.

## Implemented Change

- Added campaign existence check.
- Added campaign ownership check.
- Added dashboard success/cancel URLs.
- Applies budget immediately when the payment gateway returns `settled: true`.
- Returns the updated campaign in the response.
- Records `checkoutStarted` advertiser activity after session creation.
- Records `budgetFunded` advertiser activity for mock/local settled checkouts.

## Planned Change 2026-06-15 Block-Based Dashboard Checkout

Replace arbitrary `{ amountCents }` dashboard funding with
`{ campaignId, blockCount }`. The route should:

- validate a whole positive block count;
- load the campaign before deriving money;
- compute `amountCents = campaign.cpmCents * blockCount`;
- reject totals above the funding maximum before creating checkout;
- record checkout/funding activity with the derived amount.

## Implemented Change 2026-06-15 Block-Based Dashboard Checkout

`POST /api/funds/checkout` now validates `{ campaignId, blockCount }`, loads the
owned campaign, derives `amountCents` from campaign CPM and block count, rejects
over-maximum derived totals, and records activity with the derived amount.
Legacy amount-only payloads are rejected.

## Verification

- Red: `src/app/api/funds/checkout/route.test.ts` failed for missing redirect, ownership, and missing campaign handling.
- Green: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/funds/checkout/route.test.ts` passed.
- Block checkout focused verification passed with
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/funds/checkout/route.test.ts src/app/dashboard/advertiser/lib.test.ts src/app/dashboard/advertiser/campaign-list.test.tsx`.
- Root regression passed after block checkout:
  `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented block-based dashboard checkout. | Codex |
| 2026-06-15 | Planned block-based dashboard checkout. | Codex |
| 2026-06-15 | Added dashboard checkout advertiser money activity events. | Codex |
| 2026-06-15 | Implemented ownership/redirect/mock-settlement behavior. | Codex |
| 2026-06-15 | Documented ownership/redirect fix plan before code changes. | Codex |
