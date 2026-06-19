# advertiser-dashboard-context.tsx

> Last updated: 2026-06-16 | Protection: STANDARD

## Purpose

Client context for advertiser dashboard data loading and shared dashboard
actions.

## What It Does

- Stores campaign load state from `/api/campaigns`.
- Stores advertiser activity load state from `/api/activity/advertiser`.
- Provides reload callbacks to overview/activity child views.
- Normalizes activity API rows through `toActivityFeedRows()`.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `AdvertiserDashboardProviderClient` | React provider | Loads dashboard data and exposes context |
| `useAdvertiserDashboard` | hook | Reads dashboard context |
| `LoadState` | type | Campaign loading state |

## Dependencies

- Internal: `activity-feed.ts`, advertiser dashboard `lib`.
- External: React context/state/effect hooks.

## Important Notes / NEVER Change

- Keep authenticated API calls using the provided bearer token.
- Activity loading must not block campaign management.
- Preserve already-loaded activity rows when loading additional pages fails.

## Implemented Change 2026-06-16

Advertiser activity API pagination is wired into the dashboard:

- captures `nextCursor` from `/api/activity/advertiser`;
- exposes `loadMoreActivity()`;
- appends de-duplicated rows when the user requests more;
- keep existing rows visible while a later page is loading or fails.

`mergeActivityRows()` is exported as a pure helper for focused unit coverage.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Implemented advertiser activity load-more wiring and merge helper. | Codex |
| 2026-06-16 | Created doc and planned advertiser activity load-more wiring. | Codex |

## Planned Change 2026-06-18 Role-Safe Localized Activity Rows

Normalize advertiser activity rows with the active locale copy instead of
hardcoded English defaults. When appending later pages, preserve de-duplication
and newest-first ordering while using the same locale copy for incoming rows.

## Change History Addendum

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Planned localized advertiser activity row normalization. | Codex |

## Implemented Change 2026-06-18 Role-Safe Localized Activity Rows

Advertiser activity initial loads and load-more merges now pass
`t.activityFeed` into `toActivityFeedRows()`/`mergeActivityRows()`. The pure
merge helper still defaults to English for tests and non-React callers.

## Planned Change 2026-06-18 Delete Unpaid Campaign

Expose a `deleteCampaign(campaignId)` dashboard action that calls
`DELETE /api/campaigns` with the advertiser bearer token. On success, remove
the deleted campaign from the current ready campaign list. Return localized
session/network/error strings on failure so the campaign card can display them
inline.

## Implemented Change 2026-06-18 Delete Unpaid Campaign

The dashboard context now exposes `deleteCampaign()`, sends authenticated
`DELETE /api/campaigns` requests, removes successful deletions from ready
campaign state, and returns structured success/error results for campaign-card
UI.

## Bug Fix 2026-06-18 Delete Error Copy

**Symptom:** Clicking the unpaid campaign cancel button can show
"广告活动详情被拒绝。", which is the generic campaign edit rejection copy.

**Root Cause:** `deleteCampaign()` falls back to
`advertiserDashboard.campaignRejected` for non-OK delete responses when the
response body cannot be parsed as JSON. That masks route/status failures such
as 405/500 and makes a cancel/delete failure look like ad-content rejection.

**Fix Strategy:** Add a delete-specific error mapper. Translate known
`DELETE /api/campaigns` error codes, and use a status-bearing delete fallback
when the response is non-JSON or unknown.

**Regression Risk:** Keep successful deletion state removal unchanged; only the
error message path should change.

## Implemented Fix 2026-06-18 Delete Error Copy

Added `campaignDeleteErrorMessage()` and wired `deleteCampaign()` to use it.
Known delete API error codes now map to delete-specific messages, and unknown
or non-JSON failures use `deleteCampaignError(status)` instead of the generic
campaign edit rejection copy.

## Verification 2026-06-18 Delete Error Copy

- `corepack pnpm@9.12.0 --filter @spinshare/web lint` passed.
- `corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/campaigns/route.test.ts src/app/dashboard/advertiser/campaign-list.test.tsx src/app/dashboard/advertiser/advertiser-dashboard-context.test.ts` passed.

## Change History Addendum

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Implemented delete-specific error copy for unpaid campaign cancel failures. | Codex |
| 2026-06-18 | Planned delete-specific error copy for unpaid campaign cancel failures. | Codex |
| 2026-06-18 | Implemented dashboard context delete action for unpaid campaigns. | Codex |
| 2026-06-18 | Planned dashboard context delete action for unpaid campaigns. | Codex |
