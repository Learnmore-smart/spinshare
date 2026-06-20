# types.ts

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Defines the TypeScript shape for all localized SpinShare UI copy.

## What It Does

- Declares `Dictionary` and nested copy contracts.
- Forces each locale dictionary to provide required keys.
- Includes function-valued strings for dynamic amounts, counts, and labels.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `Dictionary` | interface | Full localized copy contract |
| `Locale` | type | Supported locale identifiers |

## Dependencies

- None.

## Important Notes / NEVER Change

- Keep this file aligned with `extra-dictionaries.ts` and `dictionaries.ts`.
- Prefer adding keys here before wiring UI text so missing translations fail at
  typecheck.

## Planned Change 2026-06-17 Payout Provider Errors

Add `developerDashboard.payoutConnectNotEnabled` and `developerDashboard.payoutErrorWithRequestId` to support localized payout provider failure display.

## Implemented Change 2026-06-17 Payout Provider Errors

Added `developerDashboard.payoutConnectNotEnabled` and `developerDashboard.payoutErrorWithRequestId`.

## Planned Change 2026-06-17 Payout Gate + Verification Copy

Add developer dashboard keys:
- `payoutLockedUntilMinimum`
- `payoutVerificationPending`
- `payoutVerificationCaption`

These keys let TypeScript enforce en/zh/fr coverage for the new minimum gate
and Stripe verification state.

## Implemented Change 2026-06-17 Payout Gate + Verification Copy

Added developer dashboard copy keys:
- `payoutLockedUntilMinimum`
- `payoutVerificationPending`
- `payoutVerificationCaption`

Verification:
- Web typecheck passed:
  `corepack pnpm@9.12.0 --filter @spinshare/web lint`.

## Implemented Change 2026-06-16

Added advertiser activity load-more copy keys to `advertiserDashboard`:

- `loadMoreActivity`
- `loadingMoreActivity`
- `activityLoadMoreError`

## Implemented Change 2026-06-16 Advertiser Activity Controls

Added advertiser activity search, filter, empty, and export copy keys:

- `activitySearchPlaceholder`
- `allActivity`
- `billableActivity`
- `nonBillableActivity`
- `paymentActivity`
- `exportActivityCsv`
- `noActivityFilterMatch`

## Implemented Change 2026-06-16 Developer Activity Export

Add a `developerDashboard.exportActivityCsv` key so the developer activity page
can label its visible-row CSV export without hardcoded UI text.

## Planned Change 2026-06-17 Direct Checkout On Campaign Create

Add advertiser dashboard copy keys for the create-form impression block field
and Stripe redirect state. Keep keys aligned with `extra-dictionaries.ts` so the
builder can label the block count without reusing the existing campaign-card
"buy more" copy awkwardly.

## Implemented Change 2026-06-17 Direct Checkout On Campaign Create

Added advertiser dashboard copy keys:

- `impressionBlocks`
- `impressionBlocksPlaceholder`
- `impressionBlocksHint`
- `creatingCheckout`

## Planned Change 2026-06-18 Needs-Link Status Copy

Add `advertiserDashboard.statusNeedsLink` so paid campaigns missing a
destination URL can be labeled distinctly from active campaigns in campaign and
stats views.

## Implemented Change 2026-06-18 Needs-Link Status Copy

Added `advertiserDashboard.statusNeedsLink` to the dictionary contract.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Added `payoutComingSoon` developer-dashboard copy key for the disabled cash-out state. | Cursor |
| 2026-06-18 | Added needs-link advertiser status copy key. | Codex |
| 2026-06-18 | Planned needs-link advertiser status copy key. | Codex |
| 2026-06-17 | Added create-form checkout block and redirect copy keys. | Codex |
| 2026-06-17 | Planned create-form checkout block and redirect copy keys. | Codex |
| 2026-06-17 | Added payout minimum gate and verification copy keys. | Codex |
| 2026-06-17 | Planned payout minimum gate and verification copy keys. | Codex |
| 2026-06-17 | Added payout provider error copy keys. | Codex |
| 2026-06-17 | Planned payout provider error copy keys. | Codex |
| 2026-06-16 | Added developer activity export copy key. | Codex |
| 2026-06-16 | Planned developer activity export copy key. | Codex |
| 2026-06-16 | Added advertiser activity control copy keys. | Codex |
| 2026-06-16 | Planned advertiser activity control copy keys. | Codex |
| 2026-06-16 | Added advertiser activity load-more copy keys. | Codex |
| 2026-06-16 | Created doc and planned advertiser activity load-more copy keys. | Codex |

## Planned Change 2026-06-18 Activity Feed Copy

Add a typed top-level `activityFeed` dictionary section for shared activity row
labels, event labels, duration formatting, details summary text, and detail
field labels. This keeps activity-feed helpers and dashboard components
localized for en/zh/fr without tying them to a specific dashboard role.

## Change History Addendum

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Planned shared activity feed copy contract. | Codex |

## Implemented Change 2026-06-18 Activity Feed Copy

Added the top-level `activityFeed` dictionary contract with status labels,
event labels, duration formatting, details summary text, and detail field
labels.

## Planned Change 2026-06-18 Delete Campaign Error Copy

Add typed advertiser dashboard keys for delete-specific campaign cancel errors:

- `deleteCampaignError(status)`
- `deleteCampaignHasBudget`
- `deleteCampaignHasActivity`
- `deleteCampaignNotFound`
- `deleteCampaignForbidden`

These prevent unpaid-cancel failures from falling back to campaign edit
rejection copy.

## Implemented Change 2026-06-18 Delete Campaign Error Copy

Added the typed advertiser dashboard delete error keys for status fallback,
budget/activity blocking, not-found, and forbidden delete failures.

## Planned Change 2026-06-19 Diagnostic Tooltip Copy

Add typed advertiser dashboard keys for diagnostic tooltip descriptions:

- `uncreditedDescription`
- `tooShortDescription`
- `authIssuesDescription`
- `antiAbuseDescription`
- `duplicateDescription`

These keys keep tooltip copy localized across en/zh/fr and aligned with
`extra-dictionaries.ts`.

## Implemented Change 2026-06-19 Diagnostic Tooltip Copy

Added the five advertiser dashboard diagnostic description keys to the
`Dictionary` contract so en/zh/fr dictionaries must provide tooltip copy.

## Verification 2026-06-18 Delete Campaign Error Copy

- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History Addendum 2

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Added diagnostic tooltip copy keys. | Codex |
| 2026-06-19 | Planned diagnostic tooltip copy keys. | Codex |
| 2026-06-18 | Added delete campaign error copy keys. | Codex |
| 2026-06-18 | Planned delete campaign error copy keys. | Codex |

## Planned Change 2026-06-19 Support Contact Copy

Add `developerDashboard.support` to label the shared dashboard settings support
contact. The email value remains a code constant in the settings view so only
the human-readable label is localized.

## Change History Addendum 3

| Date | Change | Author |
|------|--------|--------|
| 2026-06-19 | Planned support contact label key. | Codex |

## Implemented Change 2026-06-19 Support Contact Copy

Added `developerDashboard.support` to the dictionary contract.

## Verification 2026-06-19 Support Contact Copy

- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Planned Change 2026-06-20 Welcome Gift Event Copy

Require `activityFeed.eventLabels.welcomeGift` in the dictionary contract so
every supported locale must name the signup credit used by Recent credit.

## Change History Addendum 5

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Planned typed welcome-gift activity copy. | Codex |

## Implemented Change 2026-06-20 Welcome Gift Event Copy

`Dictionary.activityFeed.eventLabels` now requires `welcomeGift`.

## Planned Change 2026-06-20 Market Delivery Copy

Add typed `market.delivery` and
`market.deliveryProgressLabel(served, purchased)` keys so English, Chinese, and
French must cover the new public progress column and screen-reader description.

## Change History Addendum 4

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Planned typed market delivery progress copy. | Codex |
| 2026-06-19 | Added support contact label key. | Codex |
