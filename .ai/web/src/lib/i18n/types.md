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
