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

## Planned Change 2026-06-18 Needs-Link Status Copy

Add en/zh/fr `statusNeedsLink` strings for campaigns that are funded but cannot
serve because they have no valid destination URL.

## Implemented Change 2026-06-18 Needs-Link Status Copy

Added en/zh/fr `statusNeedsLink` strings: "Needs link", "需添加链接", and
"Lien requis".

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Added `payoutComingSoon` (en/zh/fr) for the disabled cash-out state while withdrawals are off; payout minimum is now $10.00. | Cursor |
| 2026-06-18 | Added needs-link advertiser status copy. | Codex |
| 2026-06-18 | Planned needs-link advertiser status copy. | Codex |
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

## Planned Change 2026-06-18 Activity Feed Copy

Add en/zh/fr `activityFeed` copy for shared activity statuses, event labels,
duration formatting, details summary text, and detail labels. These strings
will replace hardcoded English activity row labels in advertiser and developer
dashboards.

## Change History Addendum

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Planned shared activity feed locale copy. | Codex |

## Implemented Change 2026-06-18 Activity Feed Copy

Added `activityFeed` copy for English, Chinese, and French. This covers shared
activity statuses, event labels, duration formatting, details summary text, and
detail labels.

## Planned Change 2026-06-18 Delete Campaign Error Copy

Add en/zh/fr advertiser dashboard strings for delete-specific campaign cancel
failures, including status-bearing fallback copy and known API error codes.
This keeps the unpaid cancel button from showing the generic campaign detail
rejection message.

## Implemented Change 2026-06-18 Delete Campaign Error Copy

Added English, Chinese, and French advertiser dashboard strings for delete
status fallback, budget/activity blocking, not-found, and forbidden failures.

## Planned Change 2026-06-19 Diagnostic Tooltip Copy

Add en/zh/fr advertiser dashboard tooltip descriptions for the visible campaign
diagnostic badges:

- `uncreditedDescription`
- `tooShortDescription`
- `authIssuesDescription`
- `antiAbuseDescription`
- `duplicateDescription`

Do not add a tooltip for `outOfBudget` because that badge is being removed from
the visible diagnostics list.

## Implemented Change 2026-06-19 Diagnostic Tooltip Copy

Added English, Chinese, and French tooltip description strings for the five
visible campaign diagnostic badges. The `outOfBudget` label remains available
for compatibility, but there is no tooltip copy for it because the badge is not
rendered.

## Planned Change 2026-06-19 Developer Activity ID Label

Change the developer dashboard `tableHash` label from a generic `#` to a
localized activity/record id label. The table now uses this column for the
unique `activityId`, not a row number or duration, so the copy must make support
lookup intent explicit across en/zh/fr.

## Implemented Change 2026-06-19 Developer Activity ID Label

Updated the developer dashboard table label for en/zh/fr from `#` to activity
or record id copy: `Activity ID`, `记录 ID`, and `ID activité`.

## Verification 2026-06-18 Delete Campaign Error Copy

- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Verification 2026-06-19 Developer Activity ID Label

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts src/app/dashboard/developer/developer-activity-view.test.tsx src/app/dashboard/developer/developer-activity-view-render.test.tsx src/app/dashboard/developer/developer-activity-context.test.ts src/app/dashboard/developer/developer-dashboard-parts.test.tsx` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed after rerun.

## Change History Addendum 2

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Implemented developer activity id table label update. | Codex |
| 2026-06-19 | Planned developer activity id table label update. | Codex |
| 2026-06-19 | Added diagnostic tooltip copy strings. | Codex |
| 2026-06-19 | Planned diagnostic tooltip copy strings. | Codex |
| 2026-06-18 | Added delete campaign error copy strings. | Codex |
| 2026-06-18 | Planned delete campaign error copy strings. | Codex |

## Planned Change 2026-06-19 Support Contact Copy

Add en/zh/fr `developerDashboard.support` strings so the shared settings page can
label the new `support@learnx.pro` contact without hardcoded English.

## Change History Addendum 3

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Planned localized support contact label. | Codex |

## Implemented Change 2026-06-19 Support Contact Copy

Added en/zh/fr support labels for the shared dashboard settings contact:
`Support`, `支持`, and `Assistance`.

## Verification 2026-06-19 Support Contact Copy

- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Planned Change 2026-06-20 Welcome Gift Event Copy

Add localized activity event labels used by the ledger-derived welcome-gift
row:

- English: `Welcome gift`
- Simplified Chinese: `欢迎礼金`
- French: `Cadeau de bienvenue`

## Change History Addendum 5

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Planned en/zh/fr welcome-gift activity labels. | Codex |

## Implemented Change 2026-06-20 Welcome Gift Event Copy

Added `Welcome gift`, `欢迎礼金`, and `Cadeau de bienvenue` to the English,
Chinese, and French activity dictionaries.

## Change History Addendum 4

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Added localized support contact label. | Codex |
