# route.ts

> Last updated: 2026-06-20 | Protection: STANDARD

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
- **External:** `@spinshare/core` - bid ordering, money formatting, and `reconstructCampaignDelivery` (block-grid snap for the legacy `purchasedImpressions` fallback).

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

## Implemented Change 2026-06-20 Public Delivery Progress

Reintroduce only non-monetary row-level delivery counts at the user's explicit
request: settled `servedImpressions`, cumulative `purchasedImpressions`, and a
clamped `deliveryPercent`. Do not expose payment amounts, remaining budget, or
advertiser identity. Prefer the durable campaign counter and reconstruct only
legacy documents from served count plus remaining budget capacity.

## Agent Decision 2026-06-20

The prior privacy change removed spend and delivery together. This change keeps
all spend fields private while exposing the exact inventory ratio needed for a
credible public leaderboard.

## Implemented Change 2026-06-20 Market stat-bar aggregates

Added three `summary` fields to power the homepage `#bid-market` stat bar
(Market Price / Impressions / Live Now / Campaigns):

- `blendedCpmCents` + `blendedCpmUsd` — impression-weighted average CPM across
  live public campaigns: `Σ(cpmCents × purchasedImpressions) / Σ(purchasedImpressions)`,
  rounded to whole cents. This is the *blended* market price, distinct from the
  single leading `topCpmCents`. Weighting by purchased inventory (per the
  block-snapped `purchasedImpressions`) means a large buy moves the average more
  than a tiny one.
- `openImpressions` — purchased-but-undelivered inventory still being bid for,
  summed across live public campaigns: `Σ max(0, purchasedImpressions − servedImpressions)`.
  This is open market *volume*, not a delivery rate and not viewed impressions.

All three derive from fields already present on each row, so no new repository or
ledger calls were added. Empty market → all zero (`$0.00`, `0`).

## Bug Fixes

| Date | Bug | Cause | Fix |
|------|-----|-------|-----|
| 2026-06-13 | `web/src/app/api/market/route.test.ts` imported a missing route. | Live-market homepage revision added the test but not the endpoint. | Implement `GET /api/market` with sorted biddable rows and summary metrics. |
| 2026-06-13 | Homepage needed rank, CPM label, and timestamp fields that the initial route response did not include. | Route contract was too small for the final live market UI. | Expanded rows with `rank`, `cpmUsd`, and `updatedAtMs`. |
| 2026-06-18 | A $5.00 / 1,000-view buy showed "$4.95 / 991" in the market table. | `targetImpressions` and the homepage "total paid" were derived from the whole-cent `budgetCents`, which drifts low after the flush rounds sub-cent per-impression spend. | Use `reconstructCampaignDelivery` to snap `targetImpressions` to the 1,000-view block grid and return exact `totalPaidCents`/`totalPaidUsd`. |
| 2026-06-20 | A seeded 5,000-view Cursor campaign ($11.20 CPM) showed delivery `6 / 4,999` instead of `6 / 5,000`. | The 2026-06-20 public delivery-progress change reconstructed the legacy fallback `purchasedImpressions` with a **naive** `served + Math.floor(budgetCents*1000/cpmCents)`, reintroducing the 2026-06-18 drift: the flush rounds 6×1.12c → 7c so `budgetCents` settled at 5593, and the naive math reads 4,999. The existing "legacy" test masked it by using a whole-cent-per-impression CPM (1000) with no sub-cent drift. | Replace the naive fallback with core `reconstructCampaignDelivery(cpmCents, budgetCents, servedImpressions).purchasedImpressions`, which snaps the budget-derived total back onto the 1,000-view block grid (same source of truth as the advertiser dashboard's `deliveryProgress`). Stored `purchasedImpressions` is still preferred when present. Added a sub-cent-drift regression test. |

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Added `blendedCpmCents`/`blendedCpmUsd` (impression-weighted avg CPM) and `openImpressions` (remaining bid inventory) to `summary` for the homepage bid-market stat bar. | Claude |
| 2026-06-20 | Fixed legacy `purchasedImpressions` fallback to use `reconstructCampaignDelivery` (block-grid snap) so a 5,000-view buy no longer shows 4,999. | Claude |
| 2026-06-20 | Implemented non-monetary public delivery progress fields. | Codex |
| 2026-06-13 | Created documentation for market route implementation. | Codex |
| 2026-06-13 | Documented final route response contract for live homepage polling. | Codex |
| 2026-06-13 | Documented leaderboard privacy filtering plan. | Codex |
| 2026-06-13 | Synced docs with public leaderboard filtering implementation. | Codex |
| 2026-06-19 | Public market rows limited to rank + CPM; `summary.totalServedImpressions` for hero aggregate only. | Cursor |
| 2026-06-18 | Documented budget-drift correction for purchased views / total paid. | Cursor |
