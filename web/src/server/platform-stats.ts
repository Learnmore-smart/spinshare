import {
  formatCentsAsUsd,
  isBetterBid,
  VIEWABILITY_MIN_MS,
  type Campaign,
} from "@spinshare/core";

import type { CampaignRepository } from "./ports/campaign-repository";
import type { LedgerRepository } from "./ports/ledger-repository";
import type { UserRepository } from "./ports/user-repository";

const MS_PER_HOUR = 3_600_000;
const DAY_MS = 86_400_000;

export interface PlatformStats {
  updatedAtMs: number;
  totalDevelopers: number;
  totalAdvertisers: number;
  developersLast7d: number;
  developersLast30d: number;
  connectedPayouts: number;
  totalDeveloperEarningsCents: number;
  totalDeveloperEarningsUsd: string;
  totalCreditedImpressions: number;
  adHoursServed: number;
  impressionsToday: number;
  earningsTodayCents: number;
  earningsTodayUsd: string;
  liveCampaigns: number;
  topCpmCents: number;
  topCpmUsd: string;
  advertiserSpendCents: number;
  advertiserSpendUsd: string;
}

function usd(cents: number): string {
  return `$${formatCentsAsUsd(cents)}`;
}

function usdPrecise(cents: number, decimals = 3): string {
  return `$${(cents / 100).toFixed(decimals)}`;
}

function summarizeUsers(users: readonly { role: string; balanceCents: number; createdAtMs?: number; stripeConnectAccountId?: string }[], nowMs: number) {
  const sevenDaysAgo = nowMs - 7 * DAY_MS;
  const thirtyDaysAgo = nowMs - 30 * DAY_MS;
  let totalDevelopers = 0;
  let totalAdvertisers = 0;
  let developersLast7d = 0;
  let developersLast30d = 0;
  let connectedPayouts = 0;
  let totalDeveloperEarningsCents = 0;

  for (const user of users) {
    if (user.role === "developer") {
      totalDevelopers += 1;
      totalDeveloperEarningsCents += user.balanceCents;
      const createdAtMs = user.createdAtMs ?? 0;
      if (createdAtMs >= sevenDaysAgo) {
        developersLast7d += 1;
      }
      if (createdAtMs >= thirtyDaysAgo) {
        developersLast30d += 1;
      }
      if (user.stripeConnectAccountId) {
        connectedPayouts += 1;
      }
    } else if (user.role === "advertiser") {
      totalAdvertisers += 1;
    }
  }

  return {
    totalDevelopers,
    totalAdvertisers,
    developersLast7d,
    developersLast30d,
    connectedPayouts,
    totalDeveloperEarningsCents,
  };
}

function advertiserSpendCents(
  campaigns: readonly Campaign[],
  creditedByCampaign: Record<string, number>,
): number {
  return campaigns.reduce((sum, campaign) => {
    const credited = creditedByCampaign[campaign.id] ?? 0;
    return sum + (credited * campaign.cpmCents) / 1000;
  }, 0);
}

function topLiveCpmCents(campaigns: readonly Campaign[]): number {
  const live = campaigns
    .filter((campaign) => campaign.budgetCents > 0 && campaign.cpmCents > 0)
    .sort((a, b) => (isBetterBid(a, b) ? -1 : isBetterBid(b, a) ? 1 : 0));
  return live[0]?.cpmCents ?? 0;
}

export async function loadPlatformStats(deps: {
  users: UserRepository;
  campaigns: CampaignRepository;
  ledger: LedgerRepository;
  nowMs?: number;
}): Promise<PlatformStats> {
  const nowMs = deps.nowMs ?? Date.now();
  const [users, allCampaigns, fleet, liveCampaigns] = await Promise.all([
    deps.users.listAll(),
    deps.campaigns.listAll(),
    deps.ledger.summarizeFleet(nowMs),
    deps.campaigns.listBiddable(),
  ]);

  const campaignIds = allCampaigns.map((campaign) => campaign.id);
  const creditedByCampaign =
    campaignIds.length > 0
      ? await deps.ledger.countByCampaignIds(campaignIds)
      : {};

  const userSummary = summarizeUsers(users, nowMs);
  const spendCents = advertiserSpendCents(allCampaigns, creditedByCampaign);
  const topCpmCents = topLiveCpmCents(liveCampaigns);
  const adHoursServed =
    (fleet.totalCreditedImpressions * VIEWABILITY_MIN_MS) / MS_PER_HOUR;

  return {
    updatedAtMs: nowMs,
    totalDevelopers: userSummary.totalDevelopers,
    totalAdvertisers: userSummary.totalAdvertisers,
    developersLast7d: userSummary.developersLast7d,
    developersLast30d: userSummary.developersLast30d,
    connectedPayouts: userSummary.connectedPayouts,
    totalDeveloperEarningsCents: userSummary.totalDeveloperEarningsCents,
    totalDeveloperEarningsUsd: usd(userSummary.totalDeveloperEarningsCents),
    totalCreditedImpressions: fleet.totalCreditedImpressions,
    adHoursServed,
    impressionsToday: fleet.impressionsToday,
    earningsTodayCents: fleet.developerCreditsTodayCents,
    earningsTodayUsd: usd(fleet.developerCreditsTodayCents),
    liveCampaigns: liveCampaigns.length,
    topCpmCents,
    topCpmUsd: usd(topCpmCents),
    advertiserSpendCents: spendCents,
    advertiserSpendUsd: usdPrecise(spendCents),
  };
}
