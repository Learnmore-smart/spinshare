# activity-feed.test.ts

> Last updated: 2026-06-18 | Protection: STANDARD

## Purpose

Tests shared activity feed formatting helpers.

## Planned Coverage

- Credited rows show a human-readable credited status and USD credit.
- Too-short rows show duration and zero credit.
- Rows sort newest first for dashboard activity feeds.
- Advertiser money event rows show event-specific labels and amounts.

## Implemented Coverage 2026-06-15 Advertiser Money Events

Added coverage for `budgetFunded` advertiser event formatting: label, event
detail text, amount label, counted flag, and type preservation.

## Planned Coverage 2026-06-16 Developer Payout Events

Add RED coverage for payout paid/failed/blocked developer event formatting.

## Implemented Coverage 2026-06-16 Developer Payout Events

Added feed-helper coverage for payout paid rows with provider trace details.

## Planned Coverage 2026-06-18 Sub-Cent Credited Impressions

Add regression coverage for a credited `$5 CPM` impression where gross revenue
is `500` micro-cents, whole-cent credit is `0`, and the user-facing credit label
should show the derived sub-cent developer share instead of `$0.00`.

## Implemented Coverage 2026-06-18 Sub-Cent Credited Impressions

Added a RED/GREEN regression test for a credited sub-cent row whose display
credit should be `$0.003`, not `$0.00`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Implemented sub-cent credited impression display coverage. | Codex |
| 2026-06-18 | Planned sub-cent credited impression display coverage. | Codex |
| 2026-06-16 | Added developer payout event formatting coverage. | Codex |
| 2026-06-15 | Added advertiser money event formatting coverage. | Codex |
| 2026-06-15 | Created doc before adding activity feed helper tests. | Codex |

## Planned Coverage 2026-06-18 Localized Activity Labels

Add RED coverage proving `toActivityFeedRows()` and `activityDetailItems()` can
render shared row labels from caller-supplied locale copy while keeping default
English behavior stable.

## Change History Addendum

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Planned localized activity feed helper coverage. | Codex |

## Implemented Coverage 2026-06-18 Localized Activity Labels

Added coverage for caller-supplied locale copy in `toActivityFeedRows()` and
`activityDetailItems()`, including localized status/event/detail labels and the
existing English default behavior.

## Planned Coverage 2026-06-20 Welcome Gift Activity

Add RED coverage for a localized `welcome_gift` activity. Assert that it keeps
credited status, uses the caller's welcome-gift event label, renders
`+$1.00`, and remains counted as positive credit.

## Change History Addendum 2

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Planned localized welcome-gift activity formatting coverage. | Codex |

## Implemented Coverage 2026-06-20 Welcome Gift Activity

Added localized welcome-gift normalization coverage for status, event label,
signed amount, and counted credit.
