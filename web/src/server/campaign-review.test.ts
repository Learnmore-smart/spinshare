/**
 * Tests for the pay-then-review funding gate (creditCampaignBudgetWithReview)
 * and the content-review seam (reviewCampaignContent).
 */

import { describe, expect, it } from "vitest";
import type { Campaign } from "@spinshare/core";

import { MemoryCampaignRepository } from "./adapters/memory/memory-campaign-repository";
import {
  creditCampaignBudgetWithReview,
  resolvePurchasedImpressions,
  reviewCampaignContent,
} from "./campaign-review";

function makeCampaign(repo: MemoryCampaignRepository, overrides: Partial<Campaign> = {}): Campaign {
  const campaign: Campaign = {
    id: "cmp_test",
    advertiserId: "adv_1",
    adText: "Ship faster with Acme",
    destinationUrl: "https://acme.dev",
    cpmCents: 500,
    budgetCents: 0,
    purchasedImpressions: 0,
    status: "active",
    reviewStatus: "approved",
    publicOnLeaderboard: true,
    createdAtMs: 0,
    ...overrides,
  };
  repo.seed(campaign);
  return campaign;
}

describe("reviewCampaignContent", () => {
  it("approves benign content", async () => {
    await expect(
      reviewCampaignContent({ adText: "Ship faster with Acme CI" }),
    ).resolves.toEqual({ status: "approved" });
  });

  it("rejects unsafe content", async () => {
    const result = await reviewCampaignContent({
      adText: "enter your seed phrase to claim free bitcoin",
    });
    expect(result.status).toBe("rejected");
  });
});

describe("creditCampaignBudgetWithReview (pay-then-review)", () => {
  it("reviews on first funding and applies the budget", async () => {
    const repo = new MemoryCampaignRepository();
    const campaign = makeCampaign(repo, { budgetCents: 0 });

    const status = await creditCampaignBudgetWithReview(repo, campaign, {
      amountCents: 5000,
      purchasedImpressions: 2_000,
    });

    expect(status).toBe("approved");
    const after = await repo.getById(campaign.id);
    expect(after?.budgetCents).toBe(5000);
    expect(after?.purchasedImpressions).toBe(2_000);
    expect(after?.reviewStatus).toBe("approved");
    // Approved + funded → biddable.
    expect(await repo.listBiddable()).toHaveLength(1);
  });

  it("rejects unsafe content on funding and keeps it out of bidding", async () => {
    const repo = new MemoryCampaignRepository();
    const campaign = makeCampaign(repo, {
      budgetCents: 0,
      adText: "verify your wallet to restore your account",
    });

    const status = await creditCampaignBudgetWithReview(repo, campaign, {
      amountCents: 5000,
      purchasedImpressions: 2_000,
    });

    expect(status).toBe("rejected");
    const after = await repo.getById(campaign.id);
    expect(after?.budgetCents).toBe(5000); // they paid; budget is applied
    expect(after?.reviewStatus).toBe("rejected");
    // Rejected → excluded from bidding despite having budget.
    expect(await repo.listBiddable()).toHaveLength(0);
  });

  it("does not re-review a top-up of an already-funded campaign", async () => {
    const repo = new MemoryCampaignRepository();
    const campaign = makeCampaign(repo, {
      budgetCents: 1000,
      purchasedImpressions: 1_000,
      reviewStatus: "approved",
    });

    const status = await creditCampaignBudgetWithReview(repo, campaign, {
      amountCents: 5000,
      purchasedImpressions: 2_000,
    });

    expect(status).toBe("approved");
    const after = await repo.getById(campaign.id);
    expect(after?.budgetCents).toBe(6000);
    expect(after?.purchasedImpressions).toBe(3_000);
    expect(after?.reviewStatus).toBe("approved");
  });
});

describe("resolvePurchasedImpressions", () => {
  it("prefers exact metadata and supports exact legacy block inference", () => {
    expect(resolvePurchasedImpressions(3_000, 500, 500)).toBe(3_000);
    expect(resolvePurchasedImpressions(undefined, 1_000, 500)).toBe(2_000);
    expect(resolvePurchasedImpressions(undefined, 750, 500)).toBeNull();
  });
});
