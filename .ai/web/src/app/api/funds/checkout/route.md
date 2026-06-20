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

## Planned Change 2026-06-16 Checkout Return Context

The dashboard funding success URL should include Stripe's
`{CHECKOUT_SESSION_ID}` placeholder as `checkout_session_id`, matching public
checkout and preserving post-checkout diagnostic context.

## Implemented Change 2026-06-16 Checkout Return Context

Dashboard funding success URL now includes
`checkout_session_id={CHECKOUT_SESSION_ID}`.

## Planned Change 2026-06-16 Same-Email Public Campaign Funding

Bug: homepage checkout campaigns are owned by `publicAdvertiserIdForEmail(email)`.
The dashboard can list those campaigns when the bearer token contains the same
email, but this route still checks only `campaign.advertiserId === claims.userId`.
That makes visible same-email homepage campaigns impossible to fund from the
dashboard.

Fix: resolve full auth claims, build the allowed advertiser id set from
`claims.userId` plus `publicAdvertiserIdForEmail(claims.email)` when present,
and authorize the campaign if its advertiser id is in that set.

## Implemented Change 2026-06-16 Same-Email Public Campaign Funding

`POST /api/funds/checkout` now resolves the full bearer auth claims and
authorizes campaign funding when the campaign owner matches either:

- the authenticated `claims.userId`; or
- `publicAdvertiserIdForEmail(claims.email)` for same-email homepage checkout
  campaigns.

This keeps the existing non-owner `403` boundary while allowing campaigns
bought on the homepage to be topped up from the advertiser dashboard after the
same email signs in.

## Planned Change 2026-06-18 Buy-Time CPM

The dashboard buy control now has an optional CPM field. When omitted, checkout
keeps using the campaign's current CPM. When provided, the route should:

- validate the new CPM with the core CPM bounds
- persist it on the campaign for future bids before funding
- derive this checkout's amount from `newCpmCents * blockCount`
- keep ownership and max-funding checks unchanged

## Implemented Change 2026-06-18 Buy-Time CPM

`POST /api/funds/checkout` accepts optional `cpmCents`. If provided and changed,
the route persists the new CPM through the campaign repository before creating
checkout, derives the checkout amount from the effective CPM, and leaves the
existing CPM untouched when the field is omitted.

## Implemented Change 2026-06-20 Delivery Inventory

Pass the validated block count as exact purchased impressions in Checkout
metadata and credit it through the pay-then-review funding seam for settled
mock sessions. Buy-time CPM changes must not alter the selected block count.

## Verification 2026-06-16

- Red focused run failed because the returned mock URL lacked
  `checkout_session_id`.
- Green focused run passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/memory/memory-adapters.test.ts src/app/api/advertiser-checkout/route.test.ts src/app/api/funds/checkout/route.test.ts`.
- Full regression passed:
  `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.

## Verification 2026-06-16 Same-Email Public Campaign Funding

- Red focused run failed with `403` for a campaign owned by
  `publicAdvertiserIdForEmail("buyer@example.com")` when the dashboard token had
  `userId: "google:buyer-123"` and `email: "Buyer@Example.com"`.
- Green focused run passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/funds/checkout/route.test.ts`.
- Related dashboard/claim regression passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/funds/checkout/route.test.ts src/app/api/campaigns/route.test.ts src/app/dashboard/advertiser/page.test.tsx`.

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
| 2026-06-20 | Implemented top-up purchased-inventory settlement. | Codex |
| 2026-06-18 | Implemented optional buy-time CPM update. | Codex |
| 2026-06-18 | Planned optional buy-time CPM update. | Codex |
| 2026-06-16 | Implemented same-email public campaign funding authorization. | Codex |
| 2026-06-16 | Planned same-email public campaign funding authorization fix. | Codex |
| 2026-06-16 | Implemented dashboard funding success URL session context. | Codex |
| 2026-06-16 | Planned dashboard funding success URL session context. | Codex |
| 2026-06-15 | Implemented block-based dashboard checkout. | Codex |
| 2026-06-15 | Planned block-based dashboard checkout. | Codex |
| 2026-06-15 | Added dashboard checkout advertiser money activity events. | Codex |
| 2026-06-15 | Implemented ownership/redirect/mock-settlement behavior. | Codex |
| 2026-06-15 | Documented ownership/redirect fix plan before code changes. | Codex |
