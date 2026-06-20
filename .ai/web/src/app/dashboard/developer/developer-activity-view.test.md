# developer-activity-view.test.tsx

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Tests developer activity page helper behavior and visible export affordance.

## Implemented Change

Added RED-to-GREEN tests proving that developer activity rows can be filtered by
a human search query and exported as CSV. The tests cover helper functions
without requiring a full dashboard data fixture.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `filterDeveloperActivityRows` | Function under test | Filters visible developer activity rows. |
| `developerActivityRowsToCsv` | Function under test | Converts visible developer activity rows to CSV. |

## Dependencies

- Internal: `developer-activity-view.tsx` - helper exports under test.
- External: `vitest` - test runner and assertions.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Added helper tests for developer activity filter/export. | Codex |
| 2026-06-16 | Created doc before adding developer activity export tests. | Codex |

## Planned Coverage 2026-06-20 Localized Welcome Gift Export

Normalize a Chinese welcome-gift row and prove the Recent credit search matches
`欢迎礼金` and CSV export contains the localized event plus `+$1.00`.

## Change History Addendum

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Planned localized welcome-gift search and CSV coverage. | Codex |

## Implemented Coverage 2026-06-20 Localized Welcome Gift Export

Added Chinese welcome-gift search and CSV assertions, including `+$1.00`.

## Verification 2026-06-20

- Focused dashboard run: 29 tests passed.
- Full web suite: 438 tests passed and 38 were skipped.
- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.
