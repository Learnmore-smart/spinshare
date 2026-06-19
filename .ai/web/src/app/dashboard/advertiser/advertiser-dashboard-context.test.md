# advertiser-dashboard-context.test.ts

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Tests pure advertiser dashboard context helpers.

## Implemented Coverage 2026-06-16

Covers paged activity merging:

- new rows append into the existing list;
- duplicate activity ids are de-duplicated;
- final rows stay newest-first.

Focused verification passed:
`corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/advertiser/advertiser-dashboard-context.test.ts src/app/dashboard/advertiser/advertiser-activity-feed.test.tsx`.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Added and verified mergeActivityRows coverage. | Codex |
| 2026-06-16 | Created test plan for advertiser activity page merging. | Codex |

## Planned Coverage 2026-06-18 Localized Merge

Add RED coverage that `mergeActivityRows()` accepts locale copy and applies it
to incoming rows, so later loaded advertiser activity pages do not fall back to
English labels.

## Change History Addendum

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Planned localized mergeActivityRows coverage. | Codex |

## Implemented Coverage 2026-06-18 Localized Merge

Added `mergeActivityRows()` coverage proving incoming activity pages are
formatted with caller-supplied locale copy.
