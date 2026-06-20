import {
  type Campaign,
  formatCentsAsUsd,
  isBetterBid,
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
  const reconstructedPurchased =
    campaign.cpmCents > 0
      ? servedImpressions +
        Math.floor((campaign.budgetCents * 1_000) / campaign.cpmCents)
      : servedImpressions;
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

    return Response.json(
      {
        rows,
        summary: {
          liveCampaigns: rows.length,
          topCpmCents,
          topCpmUsd: usd(topCpmCents),
          totalServedImpressions,
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
