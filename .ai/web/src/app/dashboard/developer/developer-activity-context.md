# developer-activity-context.tsx

> Last updated: 2026-06-18 | Protection: STANDARD

## Purpose

Client context for loading and paging developer/advisor activity rows.

## What It Does

- Fetches `/api/activity/developer` with the provided bearer token.
- Stores loading, ready, and error state for the activity view.
- Merges later pages by activity id and keeps rows newest-first.
- Normalizes API rows through shared activity-feed helpers.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `DeveloperActivityProviderClient` | React provider | Loads developer activity and exposes context. |
| `useDeveloperActivity` | Hook | Reads developer activity state and loaders. |
| `mergeDeveloperActivityRows` | Function | De-duplicates and sorts existing plus incoming activity rows. |

## Dependencies

- Internal: `../activity-feed`
- External: React context/state/effect hooks

## Important Notes / NEVER Change

- Keep authenticated API calls using the provided bearer token.
- Preserve already-loaded rows when loading more fails.
- Developer/advisor rows should use developer-facing copy and must not expose advertiser-only events.

## Planned Change 2026-06-18 Localized Activity Rows

Normalize developer/advisor activity rows with the active locale copy instead of
hardcoded English defaults. When appending later pages, apply the same locale
copy to incoming rows.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Created doc and planned localized developer activity normalization. | Codex |

## Implemented Change 2026-06-18 Localized Activity Rows

Developer/advisor activity initial loads and load-more merges now pass
`t.activityFeed` into the shared activity row normalizer. The merge helper keeps
an English default for tests and non-React callers.
