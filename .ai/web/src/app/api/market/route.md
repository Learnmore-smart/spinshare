# route.ts

> Last updated: 2026-06-13 | Protection: STANDARD

## Purpose

Provides live bid-market summary data for the homepage.

## What It Does

- Reads biddable campaigns from the composition-root campaign repository.
- Sorts campaigns by the same auction priority used by ad selection: highest CPM, earliest creation time, then lowest id.
- Returns summary metrics, update timestamp, and display-ready rows for the homepage market panel.
- Excludes unfunded or invalid campaigns because `listBiddable()` is the source.

## Public API

| Name | Type | Description |
|------|------|-------------|
| `GET` | route handler | Returns `{ rows, summary, updatedAtMs }` for live market display. |

## Dependencies

- **Internal:** `@/server/container` - obtains the current campaign repository.
- **External:** `@spinshare/core` - bid ordering and money formatting.

## Important Notes / NEVER Change

- Keep sorting consistent with the bidding engine.
- Do not return non-biddable campaigns in the public market list.
- This endpoint is informational only; it must not mutate money or campaigns.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-13 | `web/src/app/api/market/route.test.ts` imported a missing route. | Live-market homepage revision added the test but not the endpoint. | Implement `GET /api/market` with sorted biddable rows and summary metrics. |
| 2026-06-13 | Homepage needed rank, CPM label, and timestamp fields that the initial route response did not include. | Route contract was too small for the final live market UI. | Expanded rows with `rank`, `cpmUsd`, and `updatedAtMs`. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Created documentation for market route implementation. | Codex |
| 2026-06-13 | Documented final route response contract for live homepage polling. | Codex |
