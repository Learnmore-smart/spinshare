# campaign-list.test.tsx

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Tests campaign card rendering for advertiser dashboard funding controls.

## Planned Change 2026-06-15 Block Funding UI

Add red coverage proving the campaign card presents dashboard funding as buying
1,000-view blocks, not entering arbitrary USD funds. The static render should
include block-oriented labels and avoid the old "Add funds (USD)" wording.

## Implemented Change 2026-06-15 Block Funding UI

Added static render coverage for `CampaignList` asserting the block-oriented
label/hint are present and the old USD funding label is absent.

## Planned Change 2026-06-17 Delivery Progress UI

Add red coverage for the campaign card redesign:

- render a progressbar with served impressions as `aria-valuenow`;
- derive the target from served impressions plus remaining budget at max CPM;
- show a buy-more-impressions CTA instead of funds/recharge copy.

## Implemented Change 2026-06-17 Delivery Progress UI

Updated the static render regression to assert the progressbar ARIA values,
derived `served/target` label, buy-more-impressions CTA, and absence of the old
USD funding label.

## Verification 2026-06-17

- Red run failed before implementation because the progressbar was absent:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/advertiser/campaign-list.test.tsx`.
- Focused run passed after implementation:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/advertiser/campaign-list.test.tsx`.

## Planned Change 2026-06-18 Brand Icon Rendering

Add static render coverage that a campaign with `brandIconDataUrl` renders the
uploaded image in the card header brand slot instead of the placeholder icon.

## Implemented Change 2026-06-18 Brand Icon Rendering

Added static render coverage proving a saved `brandIconDataUrl` produces an
`adv-camp-brand-icon` image in the campaign card header and omits the placeholder
class.

## Planned Change 2026-06-19 Diagnostic Tooltip Regression

Extend static render coverage to assert that campaign diagnostics no longer
render the advertiser-facing `Out of budget` badge, while visible diagnostic
badges include tooltip markup and explanatory copy.

## Implemented Change 2026-06-19 Diagnostic Tooltip Regression

Added static render coverage that sets a nonzero `invalidCampaign` telemetry
value, confirms `Out of budget` is absent, and confirms tooltip markup plus
representative descriptions for the remaining diagnostic badges.

## Verification 2026-06-19 Diagnostic Tooltip Regression

- Red run failed before implementation because `Out of budget` still rendered.
- Focused run passed after implementation:
  `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/advertiser/campaign-list.test.tsx`.
- Web typecheck passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web lint`.

## Verification 2026-06-18 Brand Icon Rendering

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts src/app/dashboard/advertiser/campaign-list.test.tsx` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Verification 2026-06-15

- Focused: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/funds/checkout/route.test.ts src/app/dashboard/advertiser/lib.test.ts src/app/dashboard/advertiser/campaign-list.test.tsx`.
- Full: `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Implemented diagnostic tooltip cleanup regression test. | Codex |
| 2026-06-19 | Planned diagnostic tooltip cleanup regression test. | Codex |
| 2026-06-18 | Implemented brand icon card rendering regression test. | Codex |
| 2026-06-18 | Planned brand icon card rendering regression test. | Codex |
| 2026-06-17 | Implemented delivery progress and buy-more copy regression test. | Codex |
| 2026-06-17 | Planned campaign delivery progress and buy-more copy regression test. | Codex |
| 2026-06-15 | Implemented campaign list block funding UI test. | Codex |
| 2026-06-15 | Created campaign list UI test plan for block funding. | Codex |
