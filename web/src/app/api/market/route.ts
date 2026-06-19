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
  cpmCents: number;
  cpmUsd: string;
  bidLabel: string;
  remainingBudgetCents: number;
  remainingBudgetUsd: string;
  servedImpressions: number;
  /** Whole-block impressions purchased (snapped to the 1k-view grid). */
  targetImpressions: number;
  /** Exact lifetime amount the advertiser paid for this campaign, in cents. */
  totalPaidCents: number;
  /** {@link totalPaidCents} formatted as a `$`-prefixed USD string. */
  totalPaidUsd: string;
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

function toMarketRow(
  campaign: Campaign,
  index: number,
  servedImpressions: number,
): MarketRow {
  const cpmUsd = usd(campaign.cpmCents);
  // Reconstruct purchased views + paid amount from the (lossy) whole-cent
  // budget, snapping back onto the 1k-view block grid so flush rounding never
  // makes a $5.00 / 1,000-view buy read as "$4.95 / 991". See core money.ts.
  const delivery = reconstructCampaignDelivery(
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
    servedImpressions,
    targetImpressions: delivery.purchasedImpressions,
    totalPaidCents: delivery.totalPaidCents,
    totalPaidUsd: usd(delivery.totalPaidCents),
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
