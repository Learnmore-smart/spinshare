import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Campaign } from "@spinshare/core";

import {
  getContainer,
  resetContainer,
  type Container,
} from "@/server/container";
import { MemoryCampaignRepository, MemoryLedgerRepository } from "@/server/adapters/memory";

import { GET } from "./route";

const ENV_KEYS = [
  "SPINSHARE_MODE",
  "SPINSHARE_COUNTER",
  "FIRESTORE_EMULATOR_HOST",
  "STRIPE_MODE",
  "AUTH_MODE",
] as const;

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  process.env.SPINSHARE_MODE = "local";
  process.env.SPINSHARE_COUNTER = "memory";
  delete process.env.FIRESTORE_EMULATOR_HOST;
  process.env.STRIPE_MODE = "mock";
  process.env.AUTH_MODE = "mock";
  resetContainer();
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
  resetContainer();
});

function seedCampaign(
  container: Container,
  overrides: Partial<Campaign> & Pick<Campaign, "id">,
): void {
  const campaign: Campaign = {
    advertiserId: "adv1",
    adText: "Live developer tool ad",
    cpmCents: 3000,
    budgetCents: 5000,
    status: "active",
    // A valid HTTPS destination is now required to bid (listBiddable), so the
    // public-market fixtures must carry one to count as live.
    destinationUrl: "https://example.com",
    createdAtMs: 0,
    ...overrides,
  };
  (container.campaigns as MemoryCampaignRepository).seed(campaign);
}

describe("GET /api/market", () => {
  it("returns biddable campaigns sorted by auction priority", async () => {
    const container = getContainer();
    seedCampaign(container, { id: "cmp_low", cpmCents: 500 });
    // 2 blocks funded at a $22.00 CPM = $44.00 for 2,000 views.
    seedCampaign(container, {
      id: "cmp_top",
      cpmCents: 2200,
      budgetCents: 4400,
      purchasedImpressions: 2_000,
      adText: "Top bidder",
    });
    seedCampaign(container, { id: "cmp_unfunded", cpmCents: 9000, budgetCents: 0 });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary).toMatchObject({
      liveCampaigns: 2,
      topCpmCents: 2200,
      topCpmUsd: "$22.00",
    });
    expect(body.rows.map((row: { id: string }) => row.id)).toEqual([
      "cmp_top",
      "cmp_low",
    ]);
    expect(body.rows[0]).toMatchObject({
      rank: 1,
      adText: "Top bidder",
      bidLabel: "$22.00 / 1k imps",
      cpmCents: 2200,
      servedImpressions: 0,
      purchasedImpressions: 2_000,
      deliveryPercent: 0,
    });
    expect(body.rows[0]).not.toHaveProperty("totalPaidCents");
    expect(body.summary.totalServedImpressions).toBe(0);
    expect(body.rows.some((row: { id: string }) => row.id === "cmp_unfunded")).toBe(
      false,
    );
  });

  it("includes fleet-wide served impressions in the summary", async () => {
    const container = getContainer();
    // 2 blocks ($60.00) funded at a $30.00 CPM; 2 views served cost ~6c, so the
    // budget settled to 5994c. The market still reports the 2,000 bought views.
    seedCampaign(container, {
      id: "cmp_top",
      cpmCents: 3000,
      budgetCents: 5994,
      purchasedImpressions: 2_000,
    });
    (container.ledger as MemoryLedgerRepository).seed([
      {
        entryId: "entry-1",
        campaignId: "cmp_top",
        developerId: "dev-1",
        revenueMicrocents: 3000,
        developerCreditCents: 2,
        spinshareRetentionMicrocents: 1000,
      },
      {
        entryId: "entry-2",
        campaignId: "cmp_top",
        developerId: "dev-1",
        revenueMicrocents: 3000,
        developerCreditCents: 2,
        spinshareRetentionMicrocents: 1000,
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.rows[0]).toMatchObject({
      id: "cmp_top",
      bidLabel: "$30.00 / 1k imps",
      servedImpressions: 2,
      purchasedImpressions: 2_000,
      deliveryPercent: 0.1,
    });
    expect(body.summary.totalServedImpressions).toBe(2);
  });

  it("reconstructs purchased inventory for legacy campaigns", async () => {
    const container = getContainer();
    seedCampaign(container, {
      id: "cmp_legacy",
      cpmCents: 1000,
      budgetCents: 998,
    });
    (container.ledger as MemoryLedgerRepository).seed([
      {
        entryId: "legacy-1",
        campaignId: "cmp_legacy",
        developerId: "dev-1",
        revenueMicrocents: 1000,
        developerCreditCents: 1,
        spinshareRetentionMicrocents: 400,
      },
      {
        entryId: "legacy-2",
        campaignId: "cmp_legacy",
        developerId: "dev-1",
        revenueMicrocents: 1000,
        developerCreditCents: 1,
        spinshareRetentionMicrocents: 400,
      },
    ]);

    const body = await (await GET()).json();

    expect(body.rows[0]).toMatchObject({
      servedImpressions: 2,
      purchasedImpressions: 1_000,
      deliveryPercent: 0.2,
    });
  });

  it("omits private leaderboard campaigns from the public market", async () => {
    const container = getContainer();
    seedCampaign(container, { id: "cmp_public", cpmCents: 1200 });
    seedCampaign(container, {
      id: "cmp_private",
      cpmCents: 9000,
      publicOnLeaderboard: false,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary.liveCampaigns).toBe(1);
    expect(body.rows.map((row: { id: string }) => row.id)).toEqual([
      "cmp_public",
    ]);
  });

  it("omits campaigns that are not approved by ad safety review", async () => {
    const container = getContainer();
    seedCampaign(container, { id: "cmp_approved", cpmCents: 1200 });
    seedCampaign(container, {
      id: "cmp_pending",
      cpmCents: 9000,
      reviewStatus: "pending",
    } as Partial<Campaign> & Pick<Campaign, "id">);
    seedCampaign(container, {
      id: "cmp_rejected",
      cpmCents: 8000,
      reviewStatus: "rejected",
    } as Partial<Campaign> & Pick<Campaign, "id">);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary.liveCampaigns).toBe(1);
    expect(body.rows.map((row: { id: string }) => row.id)).toEqual([
      "cmp_approved",
    ]);
  });
});
