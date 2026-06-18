/**
 * Unit/integration tests for the bidding service powering `GET /api/ad`
 * (task 5.3).
 *
 * Exercises the three observable behaviors of {@link selectAd}:
 *   1. Winner response shape — highest-CPM candidate is returned with the full
 *      available-ad shape including the `cpmUsd` display string (R1.3).
 *   2. No-candidate response — empty / ineligible repositories degrade to the
 *      `{ adAvailable: false }` sentinel (R1.4).
 *   3. Timeout fallback — a repository that never resolves still produces
 *      `{ adAvailable: false }` within the latency budget (R1.7).
 *
 * The service is injectable, so we test it directly with the in-memory
 * campaign repository (seeded fixtures) and small hand-written stubs.
 */

import { describe, expect, it } from "vitest";
import type { Campaign } from "@spinshare/core";

import { BIDDING_TIMEOUT_MS, selectAd } from "./bidding-service";
import type { CampaignRepository } from "./ports";
import {
  ManualClock,
  MemoryCampaignRepository,
  MemoryImpressionProgressRepository,
  SequentialIdGenerator,
} from "./adapters/memory";

/** Builds a fully-formed biddable campaign, overriding only what a test cares about. */
function campaign(overrides: Partial<Campaign> & Pick<Campaign, "id">): Campaign {
  return {
    advertiserId: "adv1",
    adText: "Ship faster with Acme CI",
    cpmCents: 3000,
    budgetCents: 5000,
    status: "active",
    createdAtMs: 0,
    ...overrides,
  };
}

describe("selectAd — winner response shape (R1.3, R1.6)", () => {
  it("returns the highest-CPM biddable campaign with the full available-ad shape", async () => {
    const campaigns = new MemoryCampaignRepository(
      new ManualClock(0),
      new SequentialIdGenerator(),
    );
    campaigns.seed(campaign({ id: "cmp_low", cpmCents: 1000, adText: "Cheap" }));
    campaigns.seed(
      campaign({
        id: "cmp_top",
        cpmCents: 3000,
        adText: "Ship faster with Acme CI",
      }),
    );
    campaigns.seed(campaign({ id: "cmp_mid", cpmCents: 2000, adText: "Mid" }));

    const result = await selectAd({ campaigns });

    expect(result).toEqual({
      adAvailable: true,
      campaignId: "cmp_top",
      adText: "Ship faster with Acme CI",
      cpmCents: 3000,
      cpmUsd: "30.00",
    });
  });

  it("ignores ineligible campaigns (zero budget / zero CPM) when picking the winner", async () => {
    const campaigns = new MemoryCampaignRepository(
      new ManualClock(0),
      new SequentialIdGenerator(),
    );
    // Higher CPM but unfunded → not biddable.
    campaigns.seed(campaign({ id: "cmp_unfunded", cpmCents: 9000, budgetCents: 0 }));
    // Funded but zero CPM → not biddable.
    campaigns.seed(campaign({ id: "cmp_zerocpm", cpmCents: 0, budgetCents: 5000 }));
    // The only eligible candidate.
    campaigns.seed(campaign({ id: "cmp_winner", cpmCents: 1500, adText: "Winner" }));

    const result = await selectAd({ campaigns });

    expect(result).toEqual({
      adAvailable: true,
      campaignId: "cmp_winner",
      adText: "Winner",
      cpmCents: 1500,
      cpmUsd: "15.00",
    });
  });

  it("ignores campaigns that are still pending safety review", async () => {
    const campaigns = new MemoryCampaignRepository(
      new ManualClock(0),
      new SequentialIdGenerator(),
    );
    campaigns.seed(
      campaign({
        id: "cmp_pending_review",
        cpmCents: 9000,
        adText: "High bid but not reviewed",
        reviewStatus: "pending",
      } as Partial<Campaign> & Pick<Campaign, "id">),
    );
    campaigns.seed(
      campaign({
        id: "cmp_approved",
        cpmCents: 1000,
        adText: "Approved lower bid",
        reviewStatus: "approved",
      } as Partial<Campaign> & Pick<Campaign, "id">),
    );

    const result = await selectAd({ campaigns });

    expect(result).toEqual({
      adAvailable: true,
      campaignId: "cmp_approved",
      adText: "Approved lower bid",
      cpmCents: 1000,
      cpmUsd: "10.00",
    });
  });

  it("returns a developer's pending campaign before normal bidding", async () => {
    const campaigns = new MemoryCampaignRepository(
      new ManualClock(0),
      new SequentialIdGenerator(),
    );
    const progress = new MemoryImpressionProgressRepository();
    campaigns.seed(
      campaign({
        id: "cmp_pending",
        cpmCents: 1000,
        adText: "Continue me",
      }),
    );
    campaigns.seed(
      campaign({
        id: "cmp_high",
        cpmCents: 9000,
        adText: "Higher bid",
      }),
    );
    await progress.addDuration({
      developerId: "dev_1",
      campaignId: "cmp_pending",
      viewDurationMs: 1000,
      nowMs: 10,
    });

    const result = await selectAd({
      campaigns,
      progress,
      developerId: "dev_1",
    });

    expect(result).toMatchObject({
      adAvailable: true,
      campaignId: "cmp_pending",
      adText: "Continue me",
      accumulatedViewDurationMs: 1000,
      remainingViewDurationMs: 2000,
    });
  });
});

describe("selectAd — no-candidate response (R1.4)", () => {
  it("returns { adAvailable: false } for an empty repository", async () => {
    const campaigns = new MemoryCampaignRepository(
      new ManualClock(0),
      new SequentialIdGenerator(),
    );

    const result = await selectAd({ campaigns });

    expect(result).toEqual({ adAvailable: false });
  });

  it("returns { adAvailable: false } when all campaigns are ineligible", async () => {
    const campaigns = new MemoryCampaignRepository(
      new ManualClock(0),
      new SequentialIdGenerator(),
    );
    campaigns.seed(campaign({ id: "cmp_unfunded", budgetCents: 0 }));
    campaigns.seed(campaign({ id: "cmp_zerocpm", cpmCents: 0 }));

    const result = await selectAd({ campaigns });

    expect(result).toEqual({ adAvailable: false });
  });
});

describe("selectAd — timeout fallback (R1.7)", () => {
  it("resolves to { adAvailable: false } within the budget when loading never resolves", async () => {
    // Repository whose listBiddable() never settles, simulating a stalled backend.
    const stalled: CampaignRepository = {
      listBiddable: () => new Promise<Campaign[]>(() => {}),
      getById: async () => null,
      create: async () => {
        throw new Error("not implemented");
      },
      listByAdvertiser: async () => [],
      applyBudgetDeltaCents: async () => {},
      updateReviewStatus: async () => {},
    };

    const timeoutMs = 20;
    const start = Date.now();
    const result = await selectAd({ campaigns: stalled, timeoutMs });
    const elapsed = Date.now() - start;

    expect(result).toEqual({ adAvailable: false });
    // Comfortably under the 500ms hard budget; gives headroom over the 20ms timeout.
    expect(elapsed).toBeLessThan(BIDDING_TIMEOUT_MS);
  });

  it("returns { adAvailable: false } when loading rejects", async () => {
    const failing: CampaignRepository = {
      listBiddable: async () => {
        throw new Error("backend unavailable");
      },
      getById: async () => null,
      create: async () => {
        throw new Error("not implemented");
      },
      listByAdvertiser: async () => [],
      applyBudgetDeltaCents: async () => {},
      updateReviewStatus: async () => {},
    };

    const result = await selectAd({ campaigns: failing, timeoutMs: 50 });

    expect(result).toEqual({ adAvailable: false });
  });
});
