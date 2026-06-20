# route.ts

> Last updated: 2026-06-18 | Protection: STANDARD

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
- Respect `publicOnLeaderboard === false` for public leaderboard rows.
- This endpoint is informational only; it must not mutate money or campaigns.

## Planned Change

Filter private campaigns out of the public market rows while leaving them eligible for ad delivery through the bidding endpoint.

## Planned Change (2026-06-19 — brandName for ticker)

- Include optional `brandName` on each `MarketRow` from `campaign.brandName` for homepage ticker display.

## Implemented Change (2026-06-14)

Each market row now includes:

- `servedImpressions` — durable ledger impression count for the campaign.
- `targetImpressions` — served plus remaining purchasable impressions derived from `budgetCents` and `cpmCents`.

## Implemented Change (2026-06-19) Public leaderboard privacy

Public market rows now expose only rank, campaign text, and CPM (`bidLabel`). Per-campaign
`totalPaid*`, `servedImpressions`, `targetImpressions`, `remainingBudget*`, and `status` are
removed from the public API so advertisers are not shown exact spend or delivery ratios on
the homepage. Fleet-wide `summary.totalServedImpressions` remains for the hero dashboard
aggregate counter only.

## Implemented Change (2026-06-18) Budget-drift correction

`reconstructCampaignDelivery` (core) is still used in advertiser-facing surfaces; it is no
longer part of the public `/api/market` row payload.

## Implemented Change

`GET /api/market` now filters out campaigns where `publicOnLeaderboard === false` after loading/sorting biddable campaigns. Actual ad selection still uses the repository's full biddable set.

## Planned Change 2026-06-20 Public Delivery Progress

Reintroduce only non-monetary row-level delivery counts at the user's explicit
request: settled `servedImpressions`, cumulative `purchasedImpressions`, and a
clamped `deliveryPercent`. Do not expose payment amounts, remaining budget, or
advertiser identity. Prefer the durable campaign counter and reconstruct only
legacy documents from served count plus remaining budget capacity.

## Agent Decision 2026-06-20

The prior privacy change removed spend and delivery together. This change keeps
all spend fields private while exposing the exact inventory ratio needed for a
credible public leaderboard.

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-13 | `web/src/app/api/market/route.test.ts` imported a missing route. | Live-market homepage revision added the test but not the endpoint. | Implement `GET /api/market` with sorted biddable rows and summary metrics. |
| 2026-06-13 | Homepage needed rank, CPM label, and timestamp fields that the initial route response did not include. | Route contract was too small for the final live market UI. | Expanded rows with `rank`, `cpmUsd`, and `updatedAtMs`. |
| 2026-06-18 | A $5.00 / 1,000-view buy showed "$4.95 / 991" in the market table. | `targetImpressions` and the homepage "total paid" were derived from the whole-cent `budgetCents`, which drifts low after the flush rounds sub-cent per-impression spend. | Use `reconstructCampaignDelivery` to snap `targetImpressions` to the 1,000-view block grid and return exact `totalPaidCents`/`totalPaidUsd`. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Planned non-monetary public delivery progress fields. | Codex |
| 2026-06-13 | Created documentation for market route implementation. | Codex |
| 2026-06-13 | Documented final route response contract for live homepage polling. | Codex |
| 2026-06-13 | Documented leaderboard privacy filtering plan. | Codex |
| 2026-06-13 | Synced docs with public leaderboard filtering implementation. | Codex |
| 2026-06-19 | Public market rows limited to rank + CPM; `summary.totalServedImpressions` for hero aggregate only. | Cursor |
| 2026-06-18 | Documented budget-drift correction for purchased views / total paid. | Cursor |
