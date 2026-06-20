# developer-activity-context.test.ts

> Last updated: 2026-06-18 | Protection: STANDARD

## Purpose

Tests pure developer/advisor activity context helpers.

## Planned Coverage 2026-06-18 Localized Merge

Cover `mergeDeveloperActivityRows()` with caller-supplied locale copy so later
loaded developer/advisor activity pages use the active locale instead of
falling back to English.

## Dependencies

- Internal: `developer-activity-context`, `../activity-feed`
- External: Vitest

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Created doc and planned localized merge coverage. | Codex |

## Implemented Coverage 2026-06-18 Localized Merge

Added coverage proving `mergeDeveloperActivityRows()` applies caller-supplied
locale copy to incoming activity rows.

## Planned Coverage 2026-06-20 Pinned Welcome Gift

Add RED coverage for the initial pinned-plus-fetched merge. The same welcome
gift id arriving twice must render once with the active localized event label
and `+$1.00` credit.

## Change History Addendum

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Planned stable-id and locale coverage for the initial welcome-gift merge. | Codex |

## Implemented Coverage 2026-06-20 Pinned Welcome Gift

Added coverage proving duplicate welcome-gift ids collapse to one localized
`+$1.00` row.
