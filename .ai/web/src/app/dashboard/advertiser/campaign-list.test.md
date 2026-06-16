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

## Verification 2026-06-15

- Focused: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/funds/checkout/route.test.ts src/app/dashboard/advertiser/lib.test.ts src/app/dashboard/advertiser/campaign-list.test.tsx`.
- Full: `corepack pnpm@9.12.0 test` and `corepack pnpm@9.12.0 lint`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-15 | Implemented campaign list block funding UI test. | Codex |
| 2026-06-15 | Created campaign list UI test plan for block funding. | Codex |
