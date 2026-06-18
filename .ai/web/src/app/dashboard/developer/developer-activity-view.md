# developer-activity-view.tsx

> Last updated: 2026-06-18 | Protection: STANDARD

## Purpose

Developer dashboard activity page.

## Planned Change

Render attempt-level activity rows from the dashboard context instead of
credited ledger rows from `summary.rows`, so the developer can see credited and
non-credited outcomes.

## Implemented Change 2026-06-16 Developer Activity Export

Extract the activity search behavior into testable helpers and add a CSV export
link for the currently visible developer activity rows. This keeps the
developer ledger useful when debugging paid/credited/non-credited events without
changing the dashboard data contract.

The search normalizes punctuation, so queries like `no charge` can match
campaign IDs such as `cmp_no_charge`. The CSV export includes activity id,
campaign id, status, duration, credit, and created-at timestamp for the visible
rows.

## Planned Change 2026-06-16 Activity Detail Fields

Use the shared activity detail helper to expose richer row details in the
developer activity UI. Mobile cards should include an inline disclosure; the
desktop table should add a compact details column. The goal is auditability:
developers can see activity id, campaign id, status, duration, credit, created
timestamp, and any Stripe trace ids if the row carries them.

## Implemented Change 2026-06-16 Activity Detail Fields

The developer activity page now receives richer row rendering from
`ActivityList` and `ActivityTable`: mobile cards show a `Details` disclosure and
the desktop table includes a details column. Both use `activityDetailItems(row,
{ amountLabel: "Credit" })`.

## Planned Change 2026-06-18 User-Facing Activity Summary

Keep the developer activity page focused on summary columns: duration, campaign,
event, and credit. Remove raw per-row detail disclosures from the developer
dashboard presentation; raw ids and timestamps remain available through the CSV
export and API data for debugging/audit workflows.

## Implemented Change 2026-06-18 User-Facing Activity Summary

The developer activity page now shows only summary rows through `ActivityList`
and `ActivityTable`; raw detail disclosures no longer appear in the normal
dashboard view.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `DeveloperActivityView` | React component | Developer activity page with search, visible-row export, and activity list/table. |
| `filterDeveloperActivityRows` | Function | Filters activity rows by campaign, activity id, or status label. |
| `developerActivityRowsToCsv` | Function | Serializes visible activity rows to CSV. |

## Verification

- 2026-06-18: `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/dashboard/activity-feed.test.ts src/app/dashboard/developer/developer-dashboard-parts.test.tsx` passed with 10 tests after removing raw row details from the developer-facing UI.
- 2026-06-18: `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Removed raw row details from developer activity UI. | Codex |
| 2026-06-18 | Planned removal of raw row details from developer activity UI. | Codex |
| 2026-06-16 | Implemented developer activity detail fields. | Codex |
| 2026-06-16 | Planned developer activity detail fields. | Codex |
| 2026-06-16 | Implemented developer activity search helpers and CSV export. | Codex |
| 2026-06-16 | Planned developer activity search helpers and CSV export. | Codex |
| 2026-06-15 | Created doc before switching activity page to attempt-level rows. | Codex |
