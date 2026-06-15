import { type Campaign, formatCentsAsUsd, isBetterBid } from "@spinshare/core";

import { getContainer } from "@/server/container";

export const dynamic = "force-dynamic";

export interface MarketRow {
  id: string;
  rank: number;
  adText: string;
  cpmCents: number;
  cpmUsd: string;
  bidLabel: string;
  remainingBudgetCents: number;
  remainingBudgetUsd: string;
  servedImpressions: number;
  targetImpressions: number;
  status: "live";
}

export interface MarketSummary {
  liveCampaigns: number;
  topCpmCents: number;
  topCpmUsd: string;
}

export interface MarketResponse {
  rows: MarketRow[];
  summary: MarketSummary;
  updatedAtMs: number;
}

function usd(cents: number): string {
  return `$${formatCentsAsUsd(cents)}`;
}

function impressionCapacity(
  cpmCents: number,
  budgetCents: number,
  servedImpressions: number,
): { servedImpressions: number; targetImpressions: number } {
  const remainingImpressions =
    cpmCents > 0 ? Math.floor((budgetCents * 1000) / cpmCents) : 0;

  return {
    servedImpressions,
    targetImpressions: servedImpressions + remainingImpressions,
  };
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
  const impressions = impressionCapacity(
    campaign.cpmCents,
    campaign.budgetCents,
    servedImpressions,
  );

  return {
    id: campaign.id,
    rank: index + 1,
    adText: campaign.adText,
    cpmCents: campaign.cpmCents,
    cpmUsd,
    bidLabel: `${cpmUsd} / 1k imps`,
    remainingBudgetCents: campaign.budgetCents,
    remainingBudgetUsd: usd(campaign.budgetCents),
    servedImpressions: impressions.servedImpressions,
    targetImpressions: impressions.targetImpressions,
    status: "live",
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

    return Response.json(
      {
        rows,
        summary: {
          liveCampaigns: rows.length,
          topCpmCents,
          topCpmUsd: usd(topCpmCents),
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
