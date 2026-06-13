/**
 * Unit tests for the ledger service (`recordImpression`, task 6.1).
 *
 * Exercises the design "Ledger Engine" 7-step flow against the in-memory
 * adapters: `401` on missing/invalid token, `422` on missing/insufficient
 * campaign (no mutation), normal money movement, shadow-ban on the 31st
 * impression (identical success shape, no money moved), and automatic restore
 * after the 60-minute cooldown.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  type Campaign,
  computeSplit,
  formatCentsAsUsd,
  SHADOW_BAN_TTL_SECONDS,
} from "@spinshare/core";

import {
  ManualClock,
  MemoryCampaignRepository,
  MemoryCounterStore,
  MockAuthProvider,
  SequentialIdGenerator,
} from "./adapters/memory";
import {
  INVALID_CAMPAIGN_ERROR,
  UNAUTHORIZED_ERROR,
  recordImpression,
  type LedgerServiceDeps,
} from "./ledger-service";

const CPM = 3000; // $30 CPM → 3000 microcents revenue, 2¢ developer credit.
const DEV = "dev-1";

function fundedCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "cmp-1",
    advertiserId: "adv-1",
    adText: "Ship faster with Acme CI",
    cpmCents: CPM,
    budgetCents: 1000,
    status: "active",
    createdAtMs: 0,
    ...overrides,
  };
}

interface Harness {
  deps: LedgerServiceDeps;
  clock: ManualClock;
  auth: MockAuthProvider;
  campaigns: MemoryCampaignRepository;
  counters: MemoryCounterStore;
  token: string;
}

function makeHarness(): Harness {
  const clock = new ManualClock(0);
  const ids = new SequentialIdGenerator();
  const auth = new MockAuthProvider(clock, ids);
  const campaigns = new MemoryCampaignRepository(clock, ids);
  const counters = new MemoryCounterStore(clock, ids);
  const token = auth.mintToken(DEV);
  return {
    deps: { auth, campaigns, counters, clock, ids },
    clock,
    auth,
    campaigns,
    counters,
    token,
  };
}

describe("recordImpression", () => {
  let h: Harness;

  beforeEach(() => {
    h = makeHarness();
    h.campaigns.seed(fundedCampaign());
  });

  it("rejects a missing token with 401 and moves no money", async () => {
    const result = await recordImpression(h.deps, {
      token: undefined,
      campaignId: "cmp-1",
    });

    expect(result).toEqual({ ok: false, status: 401, error: UNAUTHORIZED_ERROR });
    expect(await h.counters.getBalanceCents(DEV)).toBe(0);
    expect(await h.counters.getBudgetCents("cmp-1")).toBe(0);
  });

  it("rejects an invalid token with 401", async () => {
    const result = await recordImpression(h.deps, {
      token: "not-a-real-token",
      campaignId: "cmp-1",
    });

    expect(result).toEqual({ ok: false, status: 401, error: UNAUTHORIZED_ERROR });
  });

  it("rejects a missing campaign with 422 and moves no money", async () => {
    const result = await recordImpression(h.deps, {
      token: h.token,
      campaignId: "does-not-exist",
    });

    expect(result).toEqual({
      ok: false,
      status: 422,
      error: INVALID_CAMPAIGN_ERROR,
    });
    expect(await h.counters.getBalanceCents(DEV)).toBe(0);
  });

  it("rejects a campaign with non-positive budget with 422", async () => {
    h.campaigns.seed(fundedCampaign({ id: "cmp-empty", budgetCents: 0 }));

    const result = await recordImpression(h.deps, {
      token: h.token,
      campaignId: "cmp-empty",
    });

    expect(result).toEqual({
      ok: false,
      status: 422,
      error: INVALID_CAMPAIGN_ERROR,
    });
    expect(await h.counters.getBudgetCents("cmp-empty")).toBe(0);
  });

  it("records a valid impression: credits the developer and decrements budget", async () => {
    const split = computeSplit(CPM);

    const result = await recordImpression(h.deps, {
      token: h.token,
      campaignId: "cmp-1",
    });

    expect(result).toEqual({
      ok: true,
      response: {
        recorded: true,
        developerCreditCents: split.developerCreditCents,
        developerCreditUsd: formatCentsAsUsd(split.developerCreditCents),
      },
    });
    expect(await h.counters.getBalanceCents(DEV)).toBe(split.developerCreditCents);
    // Budget decremented by the full per-impression revenue (3000µ¢ = 3¢).
    expect(await h.counters.getBudgetCents("cmp-1")).toBe(-3);
  });

  it("shadow-bans on the 31st impression: identical success shape, no further money moves", async () => {
    const split = computeSplit(CPM);

    // First 30 impressions credit normally (within the velocity limit).
    for (let i = 0; i < 30; i++) {
      const r = await recordImpression(h.deps, {
        token: h.token,
        campaignId: "cmp-1",
      });
      expect(r.ok).toBe(true);
    }
    const balanceAfter30 = await h.counters.getBalanceCents(DEV);
    expect(balanceAfter30).toBe(30 * split.developerCreditCents);

    // The 31st impression triggers the shadow-ban: same success shape, no credit.
    const r31 = await recordImpression(h.deps, {
      token: h.token,
      campaignId: "cmp-1",
    });
    expect(r31).toEqual({
      ok: true,
      response: {
        recorded: true,
        developerCreditCents: split.developerCreditCents,
        developerCreditUsd: formatCentsAsUsd(split.developerCreditCents),
      },
    });
    expect(await h.counters.getBalanceCents(DEV)).toBe(balanceAfter30);
    expect(await h.counters.isShadowBanned(DEV)).toBe(true);
  });

  it("restores crediting after the 60-minute shadow-ban cooldown", async () => {
    const split = computeSplit(CPM);

    // Exceed the velocity limit to trigger a ban (31 impressions in one window).
    for (let i = 0; i < 31; i++) {
      await recordImpression(h.deps, { token: h.token, campaignId: "cmp-1" });
    }
    const bannedBalance = await h.counters.getBalanceCents(DEV);

    // Advance past the ban TTL (and the velocity window) so the next impression
    // credits normally again.
    h.clock.advanceSeconds(SHADOW_BAN_TTL_SECONDS + 1);

    const result = await recordImpression(h.deps, {
      token: h.token,
      campaignId: "cmp-1",
    });

    expect(result.ok).toBe(true);
    expect(await h.counters.getBalanceCents(DEV)).toBe(
      bannedBalance + split.developerCreditCents,
    );
  });
});
