# extra-dictionaries.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Extended localized copy for dashboards, setup guide, activation, advertiser dashboard, and validation errors.

## What It Does

- Supplies locale-specific strings merged into the base dictionaries.
- Keeps setup-guide and dashboard copy out of page components.
- Provides function-valued strings for dynamic amounts, counts, and labels.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `extraEn` | Constant | English extended dictionary. |
| `extraZh` | Constant | Chinese extended dictionary. |
| `extraFr` | Constant | French extended dictionary. |
| `mergeExtra` | Function | Merges base and extra dictionaries. |

## Dependencies

- Internal: `Dictionary` type.

## Important Notes / NEVER Change

- Keep keys aligned with `types.ts`.
- Do not hardcode setup-guide strings in React components when a dictionary key exists.

## Planned Change 2026-06-17 Payout Provider Errors

Add en/zh/fr developer dashboard copy for:

- `payoutConnectNotEnabled`
- `payoutErrorWithRequestId`

These strings let the payout panel show localized, actionable Stripe Connect setup failures instead of the generic retry message.

## Implemented Change 2026-06-17 Payout Provider Errors

Added en/zh/fr strings for `payoutConnectNotEnabled` and `payoutErrorWithRequestId`.

## Planned Change

Clarify extension auto-wrap and CLI device-flow setup copy. The guide should say that extension auto-wrap affects new integrated terminals, and that CLI login approval is the `/activate` device-flow approval, not a separate wakeup feature.

## Implemented Change 2026-06-15 Block Funding Copy

English advertiser dashboard funding copy now presents the control as
"Buy blocks" and explains that one block equals 1,000 impressions, with checkout
derived from the campaign's max CPM.

## Implemented Change 2026-06-16 Activity Load More

Added localized advertiser dashboard copy for activity pagination controls:

- `loadMoreActivity`
- `loadingMoreActivity`
- `activityLoadMoreError`

These strings support the advertiser activity ledger load-more UI and should be
provided for en/zh/fr.

## Implemented Change 2026-06-16 Advertiser Activity Controls

Added en/zh/fr strings for advertiser activity search, filter categories,
filtered empty state, and CSV export. Keys are aligned with `types.ts`.

## Implemented Change 2026-06-16 Developer Activity Export

Add en/zh/fr strings for the developer activity CSV export label. Keep the key
aligned with `types.ts` and avoid hardcoded copy in the React component.

## Planned Change 2026-06-17 Advertiser Purchase Copy

User feedback: advertiser dashboard copy should not say recharge/top-up; users
pay for ads/impressions. Update en/zh/fr advertiser dashboard strings so
campaign creation, empty states, and existing-campaign purchase controls use
"buy more ad impressions" semantics while preserving the existing block-count
checkout model.

## Implemented Change 2026-06-17 Advertiser Purchase Copy

Updated en/zh/fr advertiser dashboard copy to describe buying ad impressions
instead of recharge/top-up/funds. The block-count checkout model remains visible
through the `1 block = 1,000 impressions` hint.

## Planned Change 2026-06-17 Payout Gate + Verification Copy

Add en/zh/fr developer dashboard copy for:
- `payoutLockedUntilMinimum`
- `payoutVerificationPending`
- `payoutVerificationCaption`

These strings support the payout panel behavior where Stripe Connect onboarding
is locked until the $5 minimum, and accounts submitted to Stripe show a passive
verification state instead of "Finish payout setup".

## Implemented Change 2026-06-17 Payout Gate + Verification Copy

Added en/zh/fr strings for:
- `payoutLockedUntilMinimum`
- `payoutVerificationPending`
- `payoutVerificationCaption`

The Chinese copy now shows "Stripe 正在验证" for submitted accounts instead of
reusing "完成提现设置".

## Planned Change 2026-06-17 Direct Checkout On Campaign Create

Add en/zh/fr advertiser dashboard strings for:

- `impressionBlocks`
- `impressionBlocksPlaceholder`
- `impressionBlocksHint`
- `creatingCheckout`

Update campaign builder copy so the create action promises Stripe checkout
rather than creating a zero-budget campaign that must be funded separately.

## Implemented Change 2026-06-17 Direct Checkout On Campaign Create

Added en/zh/fr strings for the create-form impression block field and the
"Opening Stripe..." submitting state.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-17 | Added direct checkout create-form copy. | Codex |
| 2026-06-17 | Planned direct checkout create-form copy. | Codex |
| 2026-06-17 | Added payout minimum gate and verification copy. | Codex |
| 2026-06-17 | Planned payout minimum gate and verification copy. | Codex |
| 2026-06-17 | Implemented advertiser dashboard purchase-impressions copy update. | Codex |
| 2026-06-17 | Planned advertiser dashboard purchase-impressions copy update. | Codex |
| 2026-06-17 | Added payout provider error copy. | Codex |
| 2026-06-17 | Planned payout provider error copy. | Codex |
| 2026-06-16 | Added developer activity export copy. | Codex |
| 2026-06-16 | Planned developer activity export copy. | Codex |
| 2026-06-16 | Added advertiser activity search/filter/export copy. | Codex |
| 2026-06-16 | Planned advertiser activity search/filter/export copy. | Codex |
| 2026-06-16 | Added en/zh/fr advertiser activity load-more copy. | Codex |
| 2026-06-16 | Planned advertiser activity load-more copy. | Codex |
| 2026-06-15 | Updated English advertiser funding copy to block purchases. | Codex |
| 2026-06-15 | Created doc and documented setup copy clarification. | Codex |
