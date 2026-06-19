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
