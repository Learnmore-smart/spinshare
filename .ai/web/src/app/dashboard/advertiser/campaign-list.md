# campaign-list.tsx

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Renders advertiser campaign cards and per-campaign funding controls.

## Planned Change

Add per-campaign telemetry rows showing served impressions, shows, clicks, CTR,
and non-credit reason totals. Values must render as zero when no activity
exists.

## Constraints

- Funding controls should use block purchases, not arbitrary dollar top-ups.
- Do not show user prompts, user identifiers, or private request content.
- Keep text compact so campaign cards remain scannable.

## Implemented Change

Campaign cards now show aggregate shows, served impressions, clicks, CTR, and
reason buckets for uncredited activity.

## Planned Change 2026-06-15 Block Funding UI

Replace the per-campaign "Add funds (USD)" input with "Buy blocks". The card
should send `{ campaignId, blockCount }` to `/api/funds/checkout`; the server
derives amount from the campaign CPM.

## Implemented Change 2026-06-15 Block Funding UI

Campaign cards now validate block counts with `validateFundingBlocks()`, submit
`blockCount`, and present the control as "Buy blocks" with a hint that one block
equals 1,000 impressions.

## Planned Change 2026-06-17 Campaign Delivery Purchase UI

User feedback: the campaign card reads like a recharge panel, lacks a progress
bar, and will not scan well with multiple ads.

Plan:

- Present each campaign as a compact row card with the buy-more control visible
  on the right at desktop sizes and stacked on mobile.
- Add a delivery progress bar using served impressions over
  `served + remaining budget / CPM * 1000`, so existing and future purchased
  impressions are visible without storing a separate historical budget field.
- Rename visible copy from funds/recharge to buying more ad impressions.
- Keep the existing `/api/funds/checkout` block-count contract.

## Implemented Change 2026-06-17 Campaign Delivery Purchase UI

Campaign cards now render a compact delivery row with an accessible progress
bar, telemetry/diagnostic counters, and a right-side buy-more-impressions
control on desktop. The control still submits block counts to the existing
checkout endpoint.

## Planned Change 2026-06-18 Editable Detail Cards

Revamp the campaigns page from full-width recharge rows into a responsive grid
of detail cards. Each card should show ad text, destination URL, brand/icon,
derived status, review hints, delivery stats only when meaningful, inline edit
controls, and buy controls with block count plus optional new CPM.

## Planned Change 2026-06-18 Needs-Link Status

Add a `needsLink` status label for campaigns that have budget but cannot bid
because no valid click-through URL is saved.

## Implemented Change 2026-06-18 Editable Detail Cards

Campaign cards now render as a responsive detail-card grid with visible ad
copy, destination link, brand/icon, derived status, review hints, inline edit
form, and buy controls that accept blocks plus an optional new CPM.

## Implemented Change 2026-06-18 Needs-Link Status

The card status map includes `needsLink`, and the status dot uses the actual
derived status class so link-required campaigns show a warning treatment.

## Planned Change 2026-06-18 Unpaid Delete Action

Add a small transparent cancel action beside the buy button for unpaid
campaigns. The action should permanently delete the unpaid campaign through the
dashboard context and remove it from the list on success. The regular pay
button remains the primary action; funded campaigns must not show the delete
control.

## Implemented Change 2026-06-18 Unpaid Delete Action

`CampaignList` now accepts a `deleteCampaign` action, passes it into each card,
and renders a compact cancel button only for `isNeverFunded()` campaigns. The
button calls the delete action and surfaces inline errors without showing on
funded campaign cards.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts src/app/dashboard/advertiser/campaign-list.test.tsx src/app/dashboard/advertiser/advertiser-dashboard-context.test.ts src/server/bidding-service.test.ts` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/advertiser/campaign-list.test.tsx` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/page.test.tsx src/app/dashboard/advertiser/campaign-list.test.tsx src/app/dashboard/advertiser/advertiser-dashboard.test.tsx` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Implemented unpaid campaign delete action in campaign cards. | Codex |
| 2026-06-18 | Planned unpaid campaign delete action and transparent cancel control. | Codex |
| 2026-06-18 | Implemented editable campaign detail cards and needs-link status. | Codex |
| 2026-06-18 | Planned editable campaign detail cards and needs-link status. | Codex |
| 2026-06-17 | Implemented compact campaign delivery progress and buy-more-impressions UI. | Codex |
| 2026-06-17 | Planned compact campaign delivery progress and buy-more-impressions UI. | Codex |
| 2026-06-15 | Implemented campaign block funding UI. | Codex |
| 2026-06-15 | Planned campaign block funding UI. | Codex |
| 2026-06-15 | Planned campaign telemetry card rows. | Codex |
| 2026-06-15 | Implemented per-campaign telemetry rows. | Codex |
