/**
 * Shared {@link CampaignRepository} CONTRACT (adapter-parity foundation).
 *
 * Covers the campaign lifecycle + the money-relevant `applyBudgetDeltaCents`
 * (flush reconciliation + funding) and the `listBiddable` predicate that gates
 * which campaigns can win an auction. Memory mutates objects; Firestore uses
 * transactions + `FieldValue.increment` and an in-memory `cpmCents`/review
 * filter. Both must agree, or bidding/budgeting diverges between dev and prod.
 *
 * `create` returns an adapter-specific id (memory uses the injected id gen,
 * Firestore an auto id); the contract always uses the returned id, so the id
 * scheme is irrelevant. Error MESSAGES on unknown-id differ between adapters, so
 * the contract asserts that the call rejects, not the message text.
 */

import { describe, expect, it } from "vitest";

import type { CampaignRepository, NewCampaign } from "../campaign-repository";

export interface CampaignRepositoryContractHarness {
  makeRepo: () => CampaignRepository | Promise<CampaignRepository>;
  uid: (label: string) => string;
}

export function runCampaignRepositoryContract(
  name: string,
  harness: CampaignRepositoryContractHarness,
  options: { skip?: boolean } = {},
): void {
  const suite = options.skip ? describe.skip : describe;

  suite(`CampaignRepository contract — ${name}`, () => {
    function newCampaign(overrides: Partial<NewCampaign> = {}): NewCampaign {
      return {
        advertiserId: harness.uid("adv"),
        adText: "Ship faster",
        destinationUrl: "https://example.com",
        cpmCents: 30_000,
        ...overrides,
      };
    }

    it("create starts at zero budget, active + approved, and is retrievable", async () => {
      const repo = await harness.makeRepo();
      const created = await repo.create(newCampaign());
      expect(created.budgetCents).toBe(0);
      expect(created.purchasedImpressions).toBe(0);
      expect(created.status).toBe("active");
      expect(created.reviewStatus ?? "approved").toBe("approved");

      const got = await repo.getById(created.id);
      expect(got?.id).toBe(created.id);
      expect(got?.cpmCents).toBe(30_000);
    });

    it("getById returns null for an unknown campaign", async () => {
      const repo = await harness.makeRepo();
      expect(await repo.getById(harness.uid("missing"))).toBeNull();
    });

    it("applyBudgetDeltaCents adjusts the budget; rejects an unknown id", async () => {
      const repo = await harness.makeRepo();
      const created = await repo.create(newCampaign());

      await repo.applyBudgetDeltaCents(created.id, 5_000);
      expect((await repo.getById(created.id))?.budgetCents).toBe(5_000);
      await repo.applyBudgetDeltaCents(created.id, -2_000);
      expect((await repo.getById(created.id))?.budgetCents).toBe(3_000);

      await expect(
        repo.applyBudgetDeltaCents(harness.uid("nope"), 100),
      ).rejects.toThrow();
    });

    it("applyFunding increments budget and purchased inventory together", async () => {
      const repo = await harness.makeRepo();
      const created = await repo.create(newCampaign());

      await repo.applyFunding(created.id, {
        amountCents: 5_000,
        purchasedImpressions: 2_000,
      });

      const funded = await repo.getById(created.id);
      expect(funded?.budgetCents).toBe(5_000);
      expect(funded?.purchasedImpressions).toBe(2_000);

      await repo.applyBudgetDeltaCents(created.id, -1_000);
      expect((await repo.getById(created.id))?.purchasedImpressions).toBe(2_000);

      await expect(
        repo.applyFunding(harness.uid("nope"), {
          amountCents: 100,
          purchasedImpressions: 1_000,
        }),
      ).rejects.toThrow();
    });

    it("listBiddable includes a funded+approved campaign, excludes an unfunded one", async () => {
      const repo = await harness.makeRepo();
      const funded = await repo.create(newCampaign());
      await repo.applyBudgetDeltaCents(funded.id, 10_000);
      const unfunded = await repo.create(newCampaign()); // budget stays 0

      const biddableIds = (await repo.listBiddable()).map((c) => c.id);
      expect(biddableIds).toContain(funded.id);
      expect(biddableIds).not.toContain(unfunded.id);
    });

    it("rejected review status removes a campaign from the biddable set", async () => {
      const repo = await harness.makeRepo();
      const c = await repo.create(newCampaign());
      await repo.applyBudgetDeltaCents(c.id, 10_000);
      expect((await repo.listBiddable()).map((x) => x.id)).toContain(c.id);

      await repo.updateReviewStatus(c.id, "rejected");
      expect((await repo.listBiddable()).map((x) => x.id)).not.toContain(c.id);
    });

    it("update patches only provided fields and returns the campaign; rejects unknown", async () => {
      const repo = await harness.makeRepo();
      const c = await repo.create(newCampaign({ adText: "before" }));
      const updated = await repo.update(c.id, { adText: "after", cpmCents: 50_000 });
      expect(updated.adText).toBe("after");
      expect(updated.cpmCents).toBe(50_000);
      // Untouched field preserved.
      expect(updated.advertiserId).toBe(c.advertiserId);

      await expect(
        repo.update(harness.uid("nope"), { adText: "x" }),
      ).rejects.toThrow();
    });

    it("delete removes the campaign; rejects an unknown id", async () => {
      const repo = await harness.makeRepo();
      const c = await repo.create(newCampaign());
      await repo.delete(c.id);
      expect(await repo.getById(c.id)).toBeNull();

      await expect(repo.delete(harness.uid("nope"))).rejects.toThrow();
    });

    it("listByAdvertiser returns that advertiser's campaigns", async () => {
      const repo = await harness.makeRepo();
      const adv = harness.uid("adv");
      const c1 = await repo.create(newCampaign({ advertiserId: adv }));
      const c2 = await repo.create(newCampaign({ advertiserId: adv }));
      await repo.create(newCampaign({ advertiserId: harness.uid("other") }));

      const ids = (await repo.listByAdvertiser(adv)).map((c) => c.id).sort();
      expect(ids).toEqual([c1.id, c2.id].sort());
    });
  });
}
