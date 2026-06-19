# advertiser-activity-feed.test.tsx

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Static render tests for advertiser activity feed component.

## Planned Coverage

- Loading state is visible before API data arrives.
- Ready state renders credited and non-credited attempt rows.
- Ready state renders a load-more control when `nextCursor` exists.
- Existing rows stay visible while a later page is loading or has an inline error.
- Activity search/filter helper matches campaign, status, and money labels.
- CSV helper exports visible advertiser ledger rows with stable headers.

## Implemented Coverage 2026-06-16

- Added helper coverage for all/billable/no-charge/payment categories and
  normalized search.
- Added CSV helper coverage for stable headers and row output.

## Verification

- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/advertiser/advertiser-dashboard-context.test.ts src/app/dashboard/advertiser/advertiser-activity-feed.test.tsx` passed on 2026-06-16.
- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/advertiser/advertiser-activity-feed.test.tsx` passed on 2026-06-16.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented and verified activity filter/export tests. | Codex |
| 2026-06-16 | Planned activity filtering and CSV export coverage. | Codex |
| 2026-06-16 | Added load-more and loading-more/error coverage. | Codex |
| 2026-06-15 | Created doc before adding advertiser activity feed tests. | Codex |

## Planned Coverage 2026-06-18 Role-Safe Activity Feed

- Update render expectations so advertiser rows use budget-charge events and
  non-billed attempts, not developer-facing `credited` rows.
- Add localized render coverage for the details summary and detail labels.

## Change History Addendum

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Planned role-safe and localized advertiser activity feed coverage. | Codex |

## Implemented Coverage 2026-06-18 Role-Safe Activity Feed

Updated advertiser feed render/filter tests to use budget-charge rows for
billable user-facing activity. Added localized details coverage through the
Chinese locale provider.
