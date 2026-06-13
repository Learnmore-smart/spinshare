/**
 * Integration test for the atomic impression update (task 6.5).
 *
 * Requirement 2.5: an impression must apply the User_Balance increment and the
 * campaign budget decrement to the (Redis) counter store as a *single atomic
 * update* before returning a response. The in-memory `MemoryCounterStore` is the
 * local stand-in for that hot path and performs the three effects — credit the
 * developer balance, decrement the campaign budget by the full per-impression
 * revenue, and enqueue exactly one durable `LedgerEntry` — under a single
 * synchronous critical section (design "Redis→Firestore Reconciliation":
 * "The in-memory adapter performs the same steps under a single synchronous
 * critical section").
 *
 * Because that critical section is synchronous (JavaScript's run-to-completion
 * model gives us atomicity with no interleaving), atomicity is guaranteed by
 * construction. These tests therefore assert the *post-conditions* directly:
 * the three effects are always mutually consistent — there is never a credited
 * balance without the corresponding enqueued ledger entry and budget decrement,
 * and never a partial money move.
 */

import { describe, expect, it } from "vitest";
import { computeSplit, type Split } from "@spinshare/core";
import {
  ManualClock,
  MemoryCounterStore,
  SequentialIdGenerator,
} from "./adapters/memory/index";

const DEVELOPER_ID = "dev1";
const CAMPAIGN_ID = "cmp1";

/** Builds a fresh store with deterministic time + ids. */
function makeStore(): MemoryCounterStore {
  return new MemoryCounterStore(new ManualClock(0), new SequentialIdGenerator());
}

/**
 * Reads a required numeric entry from a `Record<string, number>` aggregate,
 * failing loudly (rather than returning `undefined`) so the test stays clean
 * under `noUncheckedIndexedAccess`.
 */
function required(record: Record<string, number>, key: string): number {
  const value = record[key];
  expect(value, `expected aggregate to contain key "${key}"`).toBeDefined();
  return value as number;
}

describe("atomic impression update (Requirement 2.5)", () => {
  it("applies balance credit + budget decrement + ledger enqueue as one unit", async () => {
    const store = makeStore();
    const split: Split = computeSplit(3000); // $30 CPM → 3000µ¢ revenue, 2¢ credit.

    const result = await store.applyImpression({
      developerId: DEVELOPER_ID,
      campaignId: CAMPAIGN_ID,
      entryId: "entry1",
      split,
      occurredAtMs: 0,
    });

    // The mutation reports success and the post-mutation balance/budget.
    expect(result.applied).toBe(true);
    expect(result.entryId).toBe("entry1");

    // Effect 1: developer balance credited by exactly the split's credit.
    expect(result.balanceCents).toBe(split.developerCreditCents);
    expect(await store.getBalanceCents(DEVELOPER_ID)).toBe(
      split.developerCreditCents,
    );

    // Effect 2: campaign budget decremented by the full per-impression revenue
    // (3000µ¢ = 3¢, stored as a negative pending delta).
    expect(await store.getBudgetCents(CAMPAIGN_ID)).toBe(-3);

    // Effect 3: exactly one durable ledger entry enqueued, visible via drain.
    const batch = await store.drainPending(10);
    expect(batch.entries).toHaveLength(1);
    const [entry] = batch.entries;
    expect(entry).toBeDefined();
    expect(entry?.entryId).toBe("entry1");
    expect(entry?.developerId).toBe(DEVELOPER_ID);
    expect(entry?.campaignId).toBe(CAMPAIGN_ID);

    // All three effects describe the *same* money move (no partial state):
    // the enqueued entry's amounts match the balance credit and budget debit.
    expect(entry?.developerCreditCents).toBe(split.developerCreditCents);
    expect(entry?.revenueMicrocents).toBe(split.revenueMicrocents);
    expect(required(batch.balanceDeltaCentsByUser, DEVELOPER_ID)).toBe(
      split.developerCreditCents,
    );
    expect(required(batch.budgetDeltaCentsByCampaign, CAMPAIGN_ID)).toBe(-3);
  });

  it("is idempotent by entryId: a replay never double-credits or double-enqueues", async () => {
    const store = makeStore();
    const split = computeSplit(3000);
    const input = {
      developerId: DEVELOPER_ID,
      campaignId: CAMPAIGN_ID,
      entryId: "entry1",
      split,
      occurredAtMs: 0,
    };

    const first = await store.applyImpression(input);
    const replay = await store.applyImpression(input);

    // The first call moved money; the replay was a no-op.
    expect(first.applied).toBe(true);
    expect(replay.applied).toBe(false);

    // Balance + budget reflect a single impression, not two.
    expect(await store.getBalanceCents(DEVELOPER_ID)).toBe(
      split.developerCreditCents,
    );
    expect(await store.getBudgetCents(CAMPAIGN_ID)).toBe(-3);

    // And exactly one ledger entry was enqueued for the repeated entryId.
    const batch = await store.drainPending(10);
    expect(batch.entries).toHaveLength(1);
  });

  it("never leaves partial state: balance, budget, and ledger always agree", async () => {
    const store = makeStore();

    // Apply a sequence of distinct impressions on the same campaign/developer.
    const splits = [computeSplit(3000), computeSplit(5000), computeSplit(1500)];
    for (let i = 0; i < splits.length; i += 1) {
      const split = splits[i];
      expect(split).toBeDefined();
      await store.applyImpression({
        developerId: DEVELOPER_ID,
        campaignId: CAMPAIGN_ID,
        entryId: `entry${i}`,
        split: split as Split,
        occurredAtMs: i,
      });
    }

    // Drain every enqueued entry and recompute the totals from the ledger
    // alone. The invariant: the pending balance/budget deltas equal exactly the
    // sum of the enqueued entries — so a credited balance can never exist
    // without its corresponding ledger entry (and vice versa).
    const batch = await store.drainPending(100);
    expect(batch.entries).toHaveLength(splits.length);

    const expectedBalanceCents = batch.entries.reduce(
      (sum, e) => sum + e.developerCreditCents,
      0,
    );
    const expectedBudgetCents = batch.entries.reduce(
      (sum, e) => sum - Math.round(e.revenueMicrocents / 1000),
      0,
    );

    expect(required(batch.balanceDeltaCentsByUser, DEVELOPER_ID)).toBe(
      expectedBalanceCents,
    );
    expect(required(batch.budgetDeltaCentsByCampaign, CAMPAIGN_ID)).toBe(
      expectedBudgetCents,
    );

    // Each enqueued entry conserves money internally: credit + retention == revenue.
    for (const entry of batch.entries) {
      expect(
        entry.developerCreditCents * 1000 + entry.spinshareRetentionMicrocents,
      ).toBe(entry.revenueMicrocents);
    }
  });
});
