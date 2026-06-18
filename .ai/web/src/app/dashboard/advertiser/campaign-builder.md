# campaign-builder.tsx

> Last updated: 2026-06-14 | Protection: STANDARD

## Purpose

Advertiser dashboard form for creating campaigns.

## Planned Change (2026-06-14)

- Remove redundant section headers (`sectionAdCopy`, `sectionBrand`, `sectionBidding`) — field labels already identify each group.
- Fix submit button box-shadow: drop default green `shadow-neon`; use amber elevation shadow via `.adv-dash-submit-btn` so the glow is not clipped at the panel bottom.

## Planned Change

When a brand icon is uploaded, preview the image at a fixed size inside the file-picker row (replacing the generic icon) without resizing the container.

## Planned Change

CPM bid input minimum is $1.00 (matches `CPM_CENTS_MIN`).

## Planned Change 2026-06-17 Direct Checkout On Create

User feedback: clicking Create campaign after completing the advertiser setup
should immediately open Stripe Checkout instead of showing "campaign created"
and requiring a second purchase step below.

Fix plan:

- Add an impression block-count input to the campaign builder.
- Validate the block count with the existing dashboard block helper.
- Submit `blockCount` with `/api/campaigns`.
- When the API returns a checkout URL, redirect the browser to Stripe.
- Do not clear the builder fields after successful checkout creation. If the
  user cancels Stripe and returns, the in-memory form state should still show
  the values they entered so they can buy again or adjust them.

Regression risk: legacy campaign creation without checkout should still work at
the API layer. The dashboard path should avoid the stale success copy that tells
users to buy impressions below.

## Implemented Change 2026-06-17 Direct Checkout On Create

The builder now includes an impression block-count input, validates it with
`validateFundingBlocks`, sends `blockCount` to `/api/campaigns`, saves the
current setup to localStorage before checkout, and redirects to the returned
Stripe Checkout URL when present. It restores saved drafts on mount so a Stripe
cancel return can show the user's prior setup values.

RED verification before implementation:
`corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/advertiser/campaign-builder.test.tsx`
failed because the block input and draft helpers were missing.

GREEN verification after implementation:
`corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts src/app/dashboard/advertiser/campaign-builder.test.tsx`
passed 9 tests after rebuilding `@spinshare/core`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Implemented direct Stripe checkout from campaign creation and draft restore. | Codex |
| 2026-06-17 | Planned direct Stripe checkout from campaign creation while preserving form state. | Codex |
| 2026-06-14 | CPM minimum raised to $1.00 in form + hints. | Codex |
| 2026-06-14 | Brand icon preview in fixed-size slot. | Codex |
