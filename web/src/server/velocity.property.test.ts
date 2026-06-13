/**
 * Property-based tests for velocity rate-limiting and shadow-ban (task 6.4).
 *
 * These drive the ledger service (`recordImpression`) against the in-memory
 * adapters, advancing the injected `ManualClock` to exercise the fixed 60-second
 * velocity window and the 60-minute shadow-ban cooldown. They complement the
 * example-based cases in `ledger-service.test.ts` by quantifying the behavior
 * across the full valid CPM range and arbitrary threshold-crossing counts.
 *
 *   - Property 17: the velocity threshold triggers a shadow-ban on the 31st
 *     impression (Requirements 10.1, 10.2).
 *   - Property 18: a shadow-banned developer still receives the normal success
 *     response, but no money moves (Requirements 10.3, 10.4, 10.5).
 *   - Property 19: the shadow-ban restores after the 60-minute cooldown
 *     (Requirement 10.6).
 *
 * All properties run with fast-check `{ numRuns: 100 }`.
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  type Campaign,
  SHADOW_BAN_TTL_SECONDS,
  VELOCITY_THRESHOLD,
  computeSplit,
  formatCentsAsUsd,
} from "@spinshare/core";

import {
  ManualClock,
  MemoryCampaignRepository,
  MemoryCounterStore,
  MockAuthProvider,
  SequentialIdGenerator,
} from "./adapters/memory";
import { recordImpression, type LedgerServiceDeps } from "./ledger-service";

const RUNS = { numRuns: 100 } as const;

const DEV = "dev-1";
const CAMPAIGN_ID = "cmp-1";

/** Valid CPM range from the design: `cpmCents` 1..100000 ($0.01–$1000.00). */
const validCpmCentsArb = fc.integer({ min: 1, max: 100000 });

interface Harness {
  deps: LedgerServiceDeps;
  clock: ManualClock;
  counters: MemoryCounterStore;
  token: string;
}

/**
 * Builds a fresh, deterministic harness for one property run: a campaign funded
 * with ample budget at the generated CPM, an authenticated developer token, and
 * a `ManualClock` starting at epoch 0 (so all impressions land in one window
 * until the clock is advanced).
 */
function makeHarness(cpmCents: number): Harness {
  const clock = new ManualClock(0);
  const ids = new SequentialIdGenerator();
  const auth = new MockAuthProvider(clock, ids);
  const campaigns = new MemoryCampaignRepository(clock, ids);
  const counters = new MemoryCounterStore(clock, ids);
  const token = auth.mintToken(DEV);

  const campaign: Campaign = {
    id: CAMPAIGN_ID,
    advertiserId: "adv-1",
    adText: "Ship faster with Acme CI",
    cpmCents,
    // Budget far exceeds any per-impression revenue across these tests; the
    // 422 check only requires `budgetCents > 0` and is never mutated here.
    budgetCents: 100000000,
    status: "active",
    createdAtMs: 0,
  };
  campaigns.seed(campaign);

  return { deps: { auth, campaigns, counters, clock, ids }, clock, counters, token };
}

/** Records one impression for the standard developer/campaign pair. */
function track(deps: LedgerServiceDeps, token: string) {
  return recordImpression(deps, { token, campaignId: CAMPAIGN_ID });
}

describe("velocity rate-limiting and shadow-ban properties", () => {
  // Feature: spinshare-ad-exchange, Property 17: Velocity threshold triggers shadow-ban on the 31st impression
  // Validates: Requirements 10.1, 10.2
  it("Property 17: impressions 1..30 credit normally and the 31st triggers the shadow-ban", async () => {
    await fc.assert(
      fc.asyncProperty(
        validCpmCentsArb,
        // A generated threshold-crossing count: at least the 31st impression.
        fc.integer({ min: VELOCITY_THRESHOLD + 1, max: 50 }),
        async (cpmCents, total) => {
          const h = makeHarness(cpmCents);
          const credit = computeSplit(cpmCents).developerCreditCents;

          for (let n = 1; n <= total; n++) {
            const result = await track(h.deps, h.token);
            expect(result.ok).toBe(true);

            const banned = await h.counters.isShadowBanned(DEV);
            const balance = await h.counters.getBalanceCents(DEV);

            if (n <= VELOCITY_THRESHOLD) {
              // Within the limit: not banned yet, every impression credits.
              expect(banned).toBe(false);
              expect(balance).toBe(n * credit);
            } else {
              // The 31st impression and beyond: shadow-ban is active and the
              // balance is frozen at the last credited (30th) impression.
              expect(banned).toBe(true);
              expect(balance).toBe(VELOCITY_THRESHOLD * credit);
            }
          }
        },
      ),
      RUNS,
    );
  });

  // Feature: spinshare-ad-exchange, Property 18: Shadow-ban yields success response with zero money movement
  // Validates: Requirements 10.3, 10.4, 10.5
  it("Property 18: while shadow-banned, the success shape is unchanged but no money moves", async () => {
    await fc.assert(
      fc.asyncProperty(
        validCpmCentsArb,
        // Number of additional impressions to record while shadow-banned.
        fc.integer({ min: 1, max: 20 }),
        async (cpmCents, bannedImpressions) => {
          const h = makeHarness(cpmCents);
          const split = computeSplit(cpmCents);

          // Drive the developer to the edge of the limit (30 credited), then
          // capture the pre-ban money state.
          for (let n = 0; n < VELOCITY_THRESHOLD; n++) {
            await track(h.deps, h.token);
          }
          const preBanBalance = await h.counters.getBalanceCents(DEV);
          const preBanBudget = await h.counters.getBudgetCents(CAMPAIGN_ID);
          expect(await h.counters.isShadowBanned(DEV)).toBe(false);

          // Every subsequent impression (the 31st onward) is shadow-banned.
          for (let n = 0; n < bannedImpressions; n++) {
            const result = await track(h.deps, h.token);

            // Identical success shape to a normally-recorded impression.
            expect(result).toEqual({
              ok: true,
              response: {
                recorded: true,
                developerCreditCents: split.developerCreditCents,
                developerCreditUsd: formatCentsAsUsd(split.developerCreditCents),
              },
            });

            // No credit to the balance, no decrement to the budget.
            expect(await h.counters.isShadowBanned(DEV)).toBe(true);
            expect(await h.counters.getBalanceCents(DEV)).toBe(preBanBalance);
            expect(await h.counters.getBudgetCents(CAMPAIGN_ID)).toBe(preBanBudget);
          }
        },
      ),
      RUNS,
    );
  });

  // Feature: spinshare-ad-exchange, Property 19: Shadow-ban restores after the 60-minute cooldown
  // Validates: Requirements 10.6
  it("Property 19: after the 60-minute cooldown the next impression credits normally again", async () => {
    await fc.assert(
      fc.asyncProperty(
        validCpmCentsArb,
        // Seconds past the cooldown TTL (also clears the velocity window).
        fc.integer({ min: 1, max: 3600 }),
        async (cpmCents, extraSeconds) => {
          const h = makeHarness(cpmCents);
          const credit = computeSplit(cpmCents).developerCreditCents;

          // Trigger the shadow-ban (31 impressions in one window).
          for (let n = 0; n <= VELOCITY_THRESHOLD; n++) {
            await track(h.deps, h.token);
          }
          expect(await h.counters.isShadowBanned(DEV)).toBe(true);
          const bannedBalance = await h.counters.getBalanceCents(DEV);
          expect(bannedBalance).toBe(VELOCITY_THRESHOLD * credit);

          // Advance past the 60-minute ban TTL (and out of the velocity window).
          h.clock.advanceSeconds(SHADOW_BAN_TTL_SECONDS + extraSeconds);
          expect(await h.counters.isShadowBanned(DEV)).toBe(false);

          // The next impression credits normally again.
          const result = await track(h.deps, h.token);
          expect(result.ok).toBe(true);
          expect(await h.counters.getBalanceCents(DEV)).toBe(bannedBalance + credit);
        },
      ),
      RUNS,
    );
  });
});
