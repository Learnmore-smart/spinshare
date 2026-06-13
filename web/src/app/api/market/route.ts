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

function byAuctionPriority(a: Campaign, b: Campaign): number {
  if (isBetterBid(a, b)) return -1;
  if (isBetterBid(b, a)) return 1;
  return 0;
}

function toMarketRow(campaign: Campaign, index: number): MarketRow {
  const cpmUsd = usd(campaign.cpmCents);

  return {
    id: campaign.id,
    rank: index + 1,
    adText: campaign.adText,
    cpmCents: campaign.cpmCents,
    cpmUsd,
    bidLabel: `${cpmUsd} / 1k imps`,
    remainingBudgetCents: campaign.budgetCents,
    remainingBudgetUsd: usd(campaign.budgetCents),
    status: "live",
  };
}

export async function GET(): Promise<Response> {
  try {
    const { campaigns } = getContainer();
    const ranked = (await campaigns.listBiddable()).sort(byAuctionPriority);
    const publicRanked = ranked.filter(
      (campaign) => campaign.publicOnLeaderboard !== false,
    );
    const rows = publicRanked.map(toMarketRow);
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
