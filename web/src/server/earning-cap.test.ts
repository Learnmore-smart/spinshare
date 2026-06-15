/**
 * Anti-abuse earning-cap enforcement tests for the ledger service.
 *
 * Guards the exact attack we care about: a bot that fakes impressions but stays
 * **under** the 30-per-60s velocity limit (so it is never shadow-banned) must
 * still be hard-capped at the per-developer hourly earning limit ($20.00). The
 * bot drips one impression per minute — always a fresh velocity window, count
 * always 1 — yet crediting stops once the hourly cap would be exceeded, and
 * resumes only when the next hour window begins.
 *
 * See `ledger-service.ts` step 5b and `@spinshare/core` `wouldExceedEarningCap`.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  type Campaign,
  DEVELOPER_HOURLY_EARNING_LIMIT_CENTS,
  HOUR_MS,
  computeSplit,
} from "@spinshare/core";

import {
  ManualClock,
  MemoryCampaignRepository,
  MemoryCounterStore,
  MockAuthProvider,
  SequentialIdGenerator,
} from "./adapters/memory";
import { recordImpression, type LedgerServiceDeps } from "./ledger-service";

// Max CPM ($1000.00 → 100000¢) yields the largest per-impression developer
// credit (60¢), so the $20.00 hourly cap is reached in few impressions.
const CPM = 100_000;
const DEV = "dev-cap";

function fundedCampaign(): Campaign {
  return {
    id: "cmp-cap",
    advertiserId: "adv-1",
    adText: "High CPM campaign",
    cpmCents: CPM,
    // Durable budget is read for the 422 check but not decremented by
    // recordImpression (only the counter delta is), so a large value keeps the
    // campaign biddable across the whole run.
    budgetCents: 10_000_000,
    status: "active",
    createdAtMs: 0,
  };
}

interface Harness {
  deps: LedgerServiceDeps;
  clock: ManualClock;
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
  campaigns.seed(fundedCampaign());
  return { deps: { auth, campaigns, counters, clock, ids }, clock, counters, token };
}

describe("ledger service — hourly earning cap (anti-bot)", () => {
  let h: Harness;

  beforeEach(() => {
    h = makeHarness();
  });

  it("caps a sub-velocity-limit bot at the $20/hour earning limit", async () => {
    const creditCents = computeSplit(CPM).developerCreditCents; // 60¢
    // Largest number of credits that fits under the cap (33 × 60¢ = $19.80).
    const maxCredited = Math.floor(
      DEVELOPER_HOURLY_EARNING_LIMIT_CENTS / creditCents,
    );
    const cappedBalance = maxCredited * creditCents;

    // Drip 40 impressions one minute apart: each lands in its own 60s velocity
    // window (count = 1) so the bot is never shadow-banned — isolating the
    // earning cap as the sole defense.
    for (let i = 0; i < 40; i++) {
      const result = await recordImpression(h.deps, {
        token: h.token,
        campaignId: "cmp-cap",
      });
      expect(result.ok).toBe(true);
      // Never velocity-banned: the cap, not the rate limiter, is doing the work.
      expect(await h.counters.isShadowBanned(DEV)).toBe(false);
      h.clock.advanceSeconds(60);
    }

    const balance = await h.counters.getBalanceCents(DEV);
    expect(balance).toBe(cappedBalance);
    // The cap held: balance never exceeded the $20.00 hourly limit.
    expect(balance).toBeLessThanOrEqual(DEVELOPER_HOURLY_EARNING_LIMIT_CENTS);
  });

  it("resumes crediting once the next hour window begins", async () => {
    const creditCents = computeSplit(CPM).developerCreditCents;
    const maxCredited = Math.floor(
      DEVELOPER_HOURLY_EARNING_LIMIT_CENTS / creditCents,
    );
    const cappedBalance = maxCredited * creditCents;

    // Exhaust the hourly cap within hour 0.
    for (let i = 0; i < 40; i++) {
      await recordImpression(h.deps, { token: h.token, campaignId: "cmp-cap" });
      h.clock.advanceSeconds(60);
    }
    expect(await h.counters.getBalanceCents(DEV)).toBe(cappedBalance);

    // Jump into the next hour window: the hourly accumulator resets, so the
    // next impression credits again.
    h.clock.setMs(HOUR_MS);
    const result = await recordImpression(h.deps, {
      token: h.token,
      campaignId: "cmp-cap",
    });

    expect(result.ok).toBe(true);
    expect(await h.counters.getBalanceCents(DEV)).toBe(cappedBalance + creditCents);
  });
});
