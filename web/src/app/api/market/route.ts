import {
  type Campaign,
  formatCentsAsUsd,
  isBetterBid,
  reconstructCampaignDelivery,
} from "@spinshare/core";

import { getContainer } from "@/server/container";

export const dynamic = "force-dynamic";

export interface MarketRow {
  id: string;
  rank: number;
  adText: string;
  brandName?: string;
  cpmCents: number;
  cpmUsd: string;
  bidLabel: string;
  servedImpressions: number;
  purchasedImpressions: number;
  deliveryPercent: number;
}

export interface MarketSummary {
  liveCampaigns: number;
  topCpmCents: number;
  topCpmUsd: string;
  /** Fleet-wide served impressions across public leaderboard campaigns. */
  totalServedImpressions: number;
  /**
   * Impression-weighted average CPM across live public campaigns:
   * `Σ(cpmCents × purchasedImpressions) / Σ(purchasedImpressions)`. This is the
   * blended price the market is actually paying per 1,000 views, distinct from
   * the single leading `topCpmCents`.
   */
  blendedCpmCents: number;
  blendedCpmUsd: string;
  /**
   * Purchased-but-undelivered inventory still being bid for, summed across live
   * public campaigns (`Σ max(0, purchasedImpressions − servedImpressions)`).
   * This is the open volume on the market, not a delivery rate.
   */
  openImpressions: number;
}

export interface MarketResponse {
  rows: MarketRow[];
  summary: MarketSummary;
  updatedAtMs: number;
}

function usd(cents: number): string {
  return `$${formatCentsAsUsd(cents)}`;
}

function byAuctionPriority(a: Campaign, b: Campaign): number {
  if (isBetterBid(a, b)) return -1;
  if (isBetterBid(b, a)) return 1;
  return 0;
}

function toMarketRow(
  campaign: Campaign,
  index: number,
  servedImpressions: number,
): MarketRow {
  const cpmUsd = usd(campaign.cpmCents);
  const storedPurchased =
    Number.isSafeInteger(campaign.purchasedImpressions) &&
    (campaign.purchasedImpressions ?? 0) > 0
      ? campaign.purchasedImpressions
      : undefined;
  // Legacy/seed campaigns predating purchased-inventory tracking carry no stored
  // count, so reconstruct the lifetime purchase from the *remaining* whole-cent
  // budget. `budgetCents` drifts a few cents below exact as the flush rounds each
  // batch's sub-cent per-impression spend to whole cents, so a naive
  // `served + budget*1000/cpm` reads low — a 5,000-view buy at a $11.20 CPM shows
  // as 4,999. reconstructCampaignDelivery snaps the raw total back onto the
  // 1,000-view block grid every fund must have used (same source of truth as the
  // advertiser dashboard's deliveryProgress).
  const reconstructedPurchased = reconstructCampaignDelivery(
    campaign.cpmCents,
    campaign.budgetCents,
    servedImpressions,
  ).purchasedImpressions;
  const purchasedImpressions = Math.max(
    servedImpressions,
    storedPurchased ?? reconstructedPurchased,
  );
  const deliveryPercent =
    purchasedImpressions === 0
      ? 0
      : Math.min(100, (servedImpressions / purchasedImpressions) * 100);

  return {
    id: campaign.id,
    rank: index + 1,
    adText: campaign.adText,
    ...(campaign.brandName !== undefined ? { brandName: campaign.brandName } : {}),
    cpmCents: campaign.cpmCents,
    cpmUsd,
    bidLabel: `${cpmUsd} / 1k imps`,
    servedImpressions,
    purchasedImpressions,
    deliveryPercent,
  };
}

export async function GET(): Promise<Response> {
  try {
    const { campaigns, ledger } = getContainer();
    const ranked = (await campaigns.listBiddable()).sort(byAuctionPriority);
    const publicRanked = ranked.filter(
      (campaign) => campaign.publicOnLeaderboard !== false,
    );
    const impressionCounts = await ledger.countByCampaignIds(
      publicRanked.map((campaign) => campaign.id),
    );
    const rows = publicRanked.map((campaign, index) =>
      toMarketRow(campaign, index, impressionCounts[campaign.id] ?? 0),
    );
    const topCpmCents = rows[0]?.cpmCents ?? 0;
    const totalServedImpressions = publicRanked.reduce(
      (sum, campaign) => sum + (impressionCounts[campaign.id] ?? 0),
      0,
    );

    // Blended price is weighted by purchased inventory so a large buy moves the
    // market average more than a tiny one; reconstructed/stored purchased counts
    // already snap to whole 1,000-view blocks (see toMarketRow).
    const purchasedTotal = rows.reduce(
      (sum, row) => sum + row.purchasedImpressions,
      0,
    );
    const blendedCpmCents =
      purchasedTotal > 0
        ? Math.round(
            rows.reduce(
              (sum, row) => sum + row.cpmCents * row.purchasedImpressions,
              0,
            ) / purchasedTotal,
          )
        : 0;
    const openImpressions = rows.reduce(
      (sum, row) =>
        sum + Math.max(0, row.purchasedImpressions - row.servedImpressions),
      0,
    );

    return Response.json(
      {
        rows,
        summary: {
          liveCampaigns: rows.length,
          topCpmCents,
          topCpmUsd: usd(topCpmCents),
          totalServedImpressions,
          blendedCpmCents,
          blendedCpmUsd: usd(blendedCpmCents),
          openImpressions,
        },
        updatedAtMs: Date.now(),
      } satisfies MarketResponse,
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
