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

/**
 * Onboarding metrics that only the durable `users` collection can answer:
 * recent sign-ups (by account-creation date) and how many developers have
 * connected a Stripe payout account. Unlike the developer headcount and
 * earnings — which derive from the append-only ledger so a deleted or
 * never-created user doc cannot zero them — these legitimately report 0 until a
 * durable developer record exists, which is honest rather than contradictory.
 */
function summarizeUserOnboarding(
  users: readonly { role: string; createdAtMs?: number; stripeConnectAccountId?: string }[],
  nowMs: number,
) {
  const sevenDaysAgo = nowMs - 7 * DAY_MS;
  const thirtyDaysAgo = nowMs - 30 * DAY_MS;
  let developersLast7d = 0;
  let developersLast30d = 0;
  let connectedPayouts = 0;

  for (const user of users) {
    if (user.role !== "developer") {
      continue;
    }
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
  }

  return { developersLast7d, developersLast30d, connectedPayouts };
}

/**
 * Distinct advertisers across all campaigns. Derived from the campaign records
 * (the durable source of truth for who is running ads) rather than from
 * `role: "advertiser"` user docs: advertisers routinely fund a campaign through
 * the homepage Stripe checkout by email and never create a durable user record,
 * and the seed market's brand campaigns carry only an `advertiserId` string. A
 * user-doc count therefore reports 0 even while live campaigns are serving.
 */
function countDistinctAdvertisers(campaigns: readonly Campaign[]): number {
  const advertiserIds = new Set<string>();
  for (const campaign of campaigns) {
    if (campaign.advertiserId.length > 0) {
      advertiserIds.add(campaign.advertiserId);
    }
  }
  return advertiserIds.size;
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

  const onboarding = summarizeUserOnboarding(users, nowMs);
  const totalAdvertisers = countDistinctAdvertisers(allCampaigns);
  const spendCents = advertiserSpendCents(allCampaigns, creditedByCampaign);
  const topCpmCents = topLiveCpmCents(liveCampaigns);
  const adHoursServed =
    (fleet.totalCreditedImpressions * VIEWABILITY_MIN_MS) / MS_PER_HOUR;

  // Headline developer headcount and lifetime earnings come from the
  // append-only ledger, not from summing `users/{id}` balances. Balances are
  // mutable (a withdrawal debits them, a migration can delete the doc) and
  // device/JWT credits may never mint a durable record — so the prior
  // user-doc sum could report $0.00 lifetime earnings while "earnings today"
  // (already ledger-derived) showed a positive number, an impossible result.
  // Sourcing both from the ledger keeps total ≥ today by construction.
  return {
    updatedAtMs: nowMs,
    totalDevelopers: fleet.distinctDevelopers,
    totalAdvertisers,
    developersLast7d: onboarding.developersLast7d,
    developersLast30d: onboarding.developersLast30d,
    connectedPayouts: onboarding.connectedPayouts,
    totalDeveloperEarningsCents: fleet.totalDeveloperCreditCents,
    totalDeveloperEarningsUsd: usd(fleet.totalDeveloperCreditCents),
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
