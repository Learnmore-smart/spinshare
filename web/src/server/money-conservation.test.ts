/**
 * End-to-end money-conservation test (long-term-stability foundation).
 *
 * `packages/core/src/conservation.property.test.ts` proves conservation for the
 * PURE reducer. This proves it for the REAL pipeline: settle impressions through
 * the CounterStore hot path, run the actual `runFlushCycle`, and assert money is
 * conserved across the durable ledger, developer balances, the Tier 3a
 * earnings-hold split, and campaign budgets — with no money created or lost.
 *
 * Runs on the in-memory adapters (fast lane, no emulator); the adapter-parity
 * contracts guarantee the Firestore/RTDB adapters behave identically, so this
 * conservation guarantee transfers to production.
 */

import { describe, expect, it } from "vitest";
import { MICROCENTS_PER_CENT, computeSplit, type Split } from "@spinshare/core";

import {
  ManualClock,
  MemoryCampaignRepository,
  MemoryCounterStore,
  MemoryLedgerRepository,
  MemoryUserRepository,
  SequentialIdGenerator,
} from "./adapters/memory";
import { runFlushCycle, type FlushServiceDeps } from "./flush-service";

/** Whole cents from micro-cents, half-away-from-zero (matches the flush). */
function toCents(microcents: number): number {
  const sign = microcents < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(microcents) / MICROCENTS_PER_CENT);
}

const FIXED_NOW = 1_700_000_000_000;

describe("money conservation across the real settle → flush pipeline", () => {
  it("conserves money across ledger, balances, hold split, and budgets", async () => {
    const counters = new MemoryCounterStore(
      new ManualClock(0),
      new SequentialIdGenerator(),
    );
    const ledger = new MemoryLedgerRepository();
    const users = new MemoryUserRepository(new SequentialIdGenerator());
    const campaigns = new MemoryCampaignRepository(
      new ManualClock(0),
      new SequentialIdGenerator(),
    );
    const deps: FlushServiceDeps = {
      counters,
      ledger,
      users,
      campaigns,
      nowMs: () => FIXED_NOW,
    };

    // Two campaigns with distinct (odd) CPMs to exercise micro-cent rounding,
    // funded well above spend.
    const START_BUDGET = 10_000_000;
    const cmpA = await campaigns.create({
      advertiserId: "adv_a",
      adText: "A",
      destinationUrl: "https://a.example",
      cpmCents: 45_500,
    });
    const cmpB = await campaigns.create({
      advertiserId: "adv_b",
      adText: "B",
      destinationUrl: "https://b.example",
      cpmCents: 31_999,
    });
    await campaigns.applyBudgetDeltaCents(cmpA.id, START_BUDGET);
    await campaigns.applyBudgetDeltaCents(cmpB.id, START_BUDGET);

    // Two established developers (so the standard hold applies).
    for (const id of ["dev_1", "dev_2"]) {
      users.seed({
        id,
        email: `${id}@x.test`,
        provider: "github",
        role: "developer",
        balanceCents: 0,
        createdAtMs: FIXED_NOW - 90 * 86_400 * 1_000,
      });
    }

    // Settle a spread of impressions across both devs and campaigns.
    const plan: Array<{ dev: string; cmp: string; cpm: number }> = [
      { dev: "dev_1", cmp: cmpA.id, cpm: 45_500 },
      { dev: "dev_1", cmp: cmpA.id, cpm: 45_500 },
      { dev: "dev_1", cmp: cmpB.id, cpm: 31_999 },
      { dev: "dev_2", cmp: cmpA.id, cpm: 45_500 },
      { dev: "dev_2", cmp: cmpB.id, cpm: 31_999 },
      { dev: "dev_2", cmp: cmpB.id, cpm: 31_999 },
    ];

    const creditByDev: Record<string, number> = { dev_1: 0, dev_2: 0 };
    const revenueMicrocentsByCmp: Record<string, number> = {
      [cmpA.id]: 0,
      [cmpB.id]: 0,
    };
    let totalRevenueMicrocents = 0;
    let totalCreditMicrocents = 0;
    let totalRetentionMicrocents = 0;

    for (let i = 0; i < plan.length; i++) {
      const { dev, cmp, cpm } = plan[i]!;
      const split: Split = computeSplit(cpm);
      // Per-impression split conservation (no money created or lost).
      expect(
        split.developerCreditCents * MICROCENTS_PER_CENT +
          split.spinshareRetentionMicrocents,
      ).toBe(split.revenueMicrocents);

      const result = await counters.applyImpression({
        developerId: dev,
        campaignId: cmp,
        entryId: `entry_${i}`,
        split,
        occurredAtMs: 0,
      });
      expect(result.applied).toBe(true);

      creditByDev[dev] = (creditByDev[dev] ?? 0) + split.developerCreditCents;
      revenueMicrocentsByCmp[cmp] =
        (revenueMicrocentsByCmp[cmp] ?? 0) + split.revenueMicrocents;
      totalRevenueMicrocents += split.revenueMicrocents;
      totalCreditMicrocents += split.developerCreditCents * MICROCENTS_PER_CENT;
      totalRetentionMicrocents += split.spinshareRetentionMicrocents;
    }

    // Global conservation: revenue == developer credit + SpinShare retention.
    expect(totalCreditMicrocents + totalRetentionMicrocents).toBe(
      totalRevenueMicrocents,
    );

    // Reconcile the whole batch durably.
    const cycle = await runFlushCycle(deps);
    expect(cycle.flushed).toBe(true);
    expect(cycle.drained).toBe(plan.length);

    // (a) Ledger: one durable entry per impression, sum of credits matches.
    const ledgerCredit =
      (await ledger.listByDeveloper("dev_1")).reduce(
        (s, e) => s + e.developerCreditCents,
        0,
      ) +
      (await ledger.listByDeveloper("dev_2")).reduce(
        (s, e) => s + e.developerCreditCents,
        0,
      );
    expect(ledger.size).toBe(plan.length);
    expect(ledgerCredit).toBe(creditByDev.dev_1! + creditByDev.dev_2!);

    // (b) Balances credited to the HELD bucket (Tier 3a): balance == held,
    //     available (balance − held) == 0, for each developer.
    for (const dev of ["dev_1", "dev_2"]) {
      const user = await users.getById(dev);
      expect(user?.balanceCents).toBe(creditByDev[dev]);
      expect(user?.heldCents).toBe(creditByDev[dev]);
      expect((user?.balanceCents ?? 0) - (user?.heldCents ?? 0)).toBe(0);
    }

    // (c) Budgets decremented by exactly the rounded total revenue per campaign.
    const campA = await campaigns.getById(cmpA.id);
    const campB = await campaigns.getById(cmpB.id);
    expect(campA?.budgetCents).toBe(
      START_BUDGET - toCents(revenueMicrocentsByCmp[cmpA.id]!),
    );
    expect(campB?.budgetCents).toBe(
      START_BUDGET - toCents(revenueMicrocentsByCmp[cmpB.id]!),
    );

    // (d) Hot-path pending deltas are cleared after a successful ack — money is
    //     in exactly one place (durable), never double-counted.
    expect(await counters.getBalanceCents("dev_1")).toBe(0);
    expect(await counters.getBalanceCents("dev_2")).toBe(0);

    // (e) After the hold window elapses, held matures into available with the
    //     total unchanged (no money created or destroyed by maturation).
    const matured = await users.matureHeldEarnings(
      "dev_1",
      FIXED_NOW + 30 * 86_400 * 1_000,
    );
    expect(matured).toBe(creditByDev.dev_1);
    const dev1 = await users.getById("dev_1");
    expect(dev1?.balanceCents).toBe(creditByDev.dev_1); // total unchanged
    expect(dev1?.heldCents).toBe(0); // now fully available
  });
});
