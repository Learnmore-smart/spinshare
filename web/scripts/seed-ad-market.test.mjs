import { describe, expect, it } from "vitest";

import {
  resolveCampaignCollection,
  SEED_CAMPAIGNS,
  toCampaignDoc,
  validateCampaigns,
} from "./seed-ad-market.mjs";

describe("seed-ad-market", () => {
  it("ships exactly the 6 expected campaigns", () => {
    expect(SEED_CAMPAIGNS.map((c) => c.id)).toEqual([
      "cmp-seed-cursor",
      "cmp-seed-learnx",
      "cmp-seed-trae",
      "cmp-seed-antigravity",
      "cmp-seed-glm",
      "cmp-seed-spinshare",
    ]);
  });

  it("honors the money model: budgetCents === cpmCents * blocks", () => {
    for (const c of SEED_CAMPAIGNS) {
      expect(c.budgetCents).toBe(c.cpmCents * c.blocks);
    }
    // The exact totals the advertiser stated.
    expect(SEED_CAMPAIGNS.map((c) => c.budgetCents)).toEqual([
      5600, 5600, 4000, 4250, 5280, 6000,
    ]);
  });

  it("validateCampaigns passes for the shipped market and rejects bad budgets", () => {
    expect(() => validateCampaigns()).not.toThrow();
    expect(() =>
      validateCampaigns([
        { id: "x", adText: "x", destinationUrl: "https://x.dev", cpmCents: 1000, blocks: 5, budgetCents: 4999 },
      ]),
    ).toThrow(/budgetCents/);
  });

  it("rejects non-https destinations and out-of-range CPM", () => {
    expect(() =>
      validateCampaigns([
        { id: "x", adText: "x", destinationUrl: "http://x.dev", cpmCents: 1000, blocks: 1, budgetCents: 1000 },
      ]),
    ).toThrow(/https/);
    expect(() =>
      validateCampaigns([
        { id: "x", adText: "x", destinationUrl: "https://x.dev", cpmCents: 99, blocks: 1, budgetCents: 99 },
      ]),
    ).toThrow(/out of range/);
  });

  it("writes active, approved, leaderboard-visible docs", () => {
    const doc = toCampaignDoc(SEED_CAMPAIGNS[0], 1234);
    expect(doc).toMatchObject({
      status: "active",
      reviewStatus: "approved",
      publicOnLeaderboard: true,
      purchasedImpressions: SEED_CAMPAIGNS[0].blocks * 1_000,
      createdAtMs: 1234,
    });
  });

  it("seeds top-level production campaigns/ only with --production, refusing a set namespace otherwise", () => {
    // No namespace → top-level collection, no flag needed.
    expect(resolveCampaignCollection({})).toBe("campaigns");
    // Namespace set (as in repo .env) without the flag → hard stop.
    expect(() =>
      resolveCampaignCollection({ SPINSHARE_FIRESTORE_NAMESPACE: "test" }),
    ).toThrow(/--production/);
    // --production forces top-level campaigns/ regardless of namespace.
    expect(
      resolveCampaignCollection(
        { SPINSHARE_FIRESTORE_NAMESPACE: "test" },
        { forceProduction: true },
      ),
    ).toBe("campaigns");
  });
});
