// Feature: spinshare-ad-exchange
//
// Property test for the Redis→Firestore reconciliation cycle (design
// "Redis→Firestore Reconciliation"). Exercises `runFlushCycle` end-to-end
// against the credential-free in-memory adapters: a sequence of impressions is
// applied to a `MemoryCounterStore` (which enqueues one durable `LedgerEntry`
// per impression), then the flush cycle(s) drain the pending work and reconcile
// it into the durable repositories.

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { MICROCENTS_PER_CENT, computeSplit } from "@spinshare/core";
import type { Campaign, LedgerEntry, User } from "@spinshare/core";

import {
  ManualClock,
  MemoryCampaignRepository,
  MemoryCounterStore,
  MemoryLedgerRepository,
  MemoryUserRepository,
  SequentialIdGenerator,
} from "./adapters/memory";
import { runFlushCycle, type FlushServiceDeps } from "./flush-service";
import type { LedgerRepository } from "./ports";

const RUNS = { numRuns: 100 } as const;

/**
 * Convert a micro-cent amount to whole cents, rounding half-away-from-zero —
 * identical to the conversion used by the counter store and flush service so
 * the test's expectation matches the implementation's aggregation exactly.
 */
function microcentsToCents(microcents: number): number {
  const sign = microcents < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(microcents) / MICROCENTS_PER_CENT);
}

/**
 * Drain every pending impression by running flush cycles until nothing remains.
 * Returns the number of full (non-empty) cycles it took. The durable repos must
 * never report a flush failure for the in-memory adapters.
 */
async function drainAll(
  deps: FlushServiceDeps,
  batchSize: number,
): Promise<number> {
  let cycles = 0;
  for (;;) {
    const result = await runFlushCycle(deps, batchSize);
    expect(result.flushed).toBe(true);
    if (result.drained === 0) break;
    cycles += 1;
  }
  return cycles;
}

/** A scenario: seeded users + campaigns and a sequence of impressions. */
const scenarioArb = fc
  .record({
    users: fc.array(
      fc.record({ startBalanceCents: fc.integer({ min: 0, max: 10_000_000 }) }),
      { minLength: 1, maxLength: 4 },
    ),
    campaigns: fc.array(
      fc.record({
        cpmCents: fc.integer({ min: 1, max: 100_000 }),
        startBudgetCents: fc.integer({ min: 0, max: 10_000_000 }),
      }),
      { minLength: 1, maxLength: 4 },
    ),
  })
  .chain(({ users, campaigns }) =>
    fc.record({
      users: fc.constant(users),
      campaigns: fc.constant(campaigns),
      impressions: fc.array(
        fc.record({
          userIdx: fc.integer({ min: 0, max: users.length - 1 }),
          campaignIdx: fc.integer({ min: 0, max: campaigns.length - 1 }),
        }),
        { minLength: 1, maxLength: 50 },
      ),
    }),
  );

describe("flush-service reconciliation properties", () => {
  // Feature: spinshare-ad-exchange, Property 10: Reconciliation conserves totals with one durable entry per impression
  // Validates: Requirements 3.3, 3.5
  it("Property 10: a flush cycle conserves balance/budget totals with exactly one durable ledger entry per impression", async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async (scenario) => {
        const counters = new MemoryCounterStore(
          new ManualClock(0),
          new SequentialIdGenerator(),
        );
        const ledger = new MemoryLedgerRepository();
        const users = new MemoryUserRepository();
        const campaigns = new MemoryCampaignRepository();
        const deps: FlushServiceDeps = { counters, ledger, users, campaigns };

        // Seed durable users with known starting balances.
        const userIds = scenario.users.map((u, i) => {
          const id = `usr_${i}`;
          const user: User = {
            id,
            email: `${id}@example.test`,
            provider: "google",
            role: "developer",
            balanceCents: u.startBalanceCents,
          };
          users.seed(user);
          return id;
        });

        // Seed durable campaigns with known starting budgets + CPMs.
        const campaignIds = scenario.campaigns.map((c, k) => {
          const id = `cmp_${k}`;
          const campaign: Campaign = {
            id,
            advertiserId: "adv_0",
            adText: "ad",
            cpmCents: c.cpmCents,
            budgetCents: c.startBudgetCents,
            status: "active",
            createdAtMs: 0,
          };
          campaigns.seed(campaign);
          return id;
        });

        // Apply each impression to the hot-path counter store. Unique entryIds
        // mean each impression enqueues exactly one durable ledger entry.
        const entryIds: string[] = [];
        const expectedCreditByUser = new Map<string, number>();
        const expectedRevenueMicrocentsByCampaign = new Map<string, number>();

        for (let i = 0; i < scenario.impressions.length; i++) {
          const impr = scenario.impressions[i]!;
          const developerId = userIds[impr.userIdx]!;
          const campaignId = campaignIds[impr.campaignIdx]!;
          const cpmCents = scenario.campaigns[impr.campaignIdx]!.cpmCents;
          const split = computeSplit(cpmCents);
          const entryId = `entry_${i}`;
          entryIds.push(entryId);

          const result = await counters.applyImpression({
            developerId,
            campaignId,
            entryId,
            split,
            occurredAtMs: 0,
          });
          expect(result.applied).toBe(true);

          expectedCreditByUser.set(
            developerId,
            (expectedCreditByUser.get(developerId) ?? 0) +
              split.developerCreditCents,
          );
          expectedRevenueMicrocentsByCampaign.set(
            campaignId,
            (expectedRevenueMicrocentsByCampaign.get(campaignId) ?? 0) +
              split.revenueMicrocents,
          );
        }

        // Reconcile everything. Default batch size (>> max impressions) drains
        // all pending work in a single cycle; the loop also tolerates batching.
        await drainAll(deps, 500);

        const N = scenario.impressions.length;

        // (a) Exactly one durable LedgerEntry per impression, keyed by entryId.
        expect(ledger.size).toBe(N);
        for (const entryId of entryIds) {
          const entry = ledger.get(entryId);
          expect(entry).toBeDefined();
          // Each entry carries the required fields (Requirement 3.5).
          expect(entry!.campaignId).toBeTruthy();
          expect(entry!.developerId).toBeTruthy();
          // Per-entry split conservation: credit + retention == revenue (exact).
          expect(
            entry!.developerCreditCents * MICROCENTS_PER_CENT +
              entry!.spinshareRetentionMicrocents,
          ).toBe(entry!.revenueMicrocents);
        }

        // (b) Durable totals are conserved (Requirement 3.3):
        // each user's balance increased by the sum of developer credits.
        for (let i = 0; i < userIds.length; i++) {
          const userId = userIds[i]!;
          const durable = await users.getById(userId);
          expect(durable).not.toBeNull();
          expect(durable!.balanceCents).toBe(
            scenario.users[i]!.startBalanceCents +
              (expectedCreditByUser.get(userId) ?? 0),
          );
        }

        // each campaign budget decreased by the full per-impression revenue
        // (aggregated in micro-cents, converted to cents once — matching flush).
        for (let k = 0; k < campaignIds.length; k++) {
          const campaignId = campaignIds[k]!;
          const durable = await campaigns.getById(campaignId);
          expect(durable).not.toBeNull();
          const revenueMicrocents =
            expectedRevenueMicrocentsByCampaign.get(campaignId) ?? 0;
          expect(durable!.budgetCents).toBe(
            scenario.campaigns[k]!.startBudgetCents -
              microcentsToCents(revenueMicrocents),
          );
        }
      }),
      RUNS,
    );
  });
});

// ── Property 11 support ────────────────────────────────────────────────────

/** Seeded user/campaign ids resolved when a scenario is applied to a harness. */
interface SeededScenario {
  userIds: string[];
  campaignIds: string[];
  entryIds: string[];
}

/**
 * Seed durable users/campaigns into the given repositories and replay the
 * scenario's impressions through the counter store (one durable `LedgerEntry`
 * per impression, keyed by a unique `entryId`). Returns the resolved ids so the
 * caller can assert on the durable state afterwards.
 */
async function applyScenario(
  scenario: {
    users: readonly { startBalanceCents: number }[];
    campaigns: readonly { cpmCents: number; startBudgetCents: number }[];
    impressions: readonly { userIdx: number; campaignIdx: number }[];
  },
  counters: MemoryCounterStore,
  users: MemoryUserRepository,
  campaigns: MemoryCampaignRepository,
): Promise<SeededScenario> {
  const userIds = scenario.users.map((u, i) => {
    const id = `usr_${i}`;
    const user: User = {
      id,
      email: `${id}@example.test`,
      provider: "google",
      role: "developer",
      balanceCents: u.startBalanceCents,
    };
    users.seed(user);
    return id;
  });

  const campaignIds = scenario.campaigns.map((c, k) => {
    const id = `cmp_${k}`;
    const campaign: Campaign = {
      id,
      advertiserId: "adv_0",
      adText: "ad",
      cpmCents: c.cpmCents,
      budgetCents: c.startBudgetCents,
      status: "active",
      createdAtMs: 0,
    };
    campaigns.seed(campaign);
    return id;
  });

  const entryIds: string[] = [];
  for (let i = 0; i < scenario.impressions.length; i++) {
    const impr = scenario.impressions[i]!;
    const developerId = userIds[impr.userIdx]!;
    const campaignId = campaignIds[impr.campaignIdx]!;
    const cpmCents = scenario.campaigns[impr.campaignIdx]!.cpmCents;
    const split = computeSplit(cpmCents);
    const entryId = `entry_${i}`;
    entryIds.push(entryId);

    const result = await counters.applyImpression({
      developerId,
      campaignId,
      entryId,
      split,
      occurredAtMs: 0,
    });
    expect(result.applied).toBe(true);
  }

  return { userIds, campaignIds, entryIds };
}

/**
 * A snapshot of the durable system of record after reconciliation: every
 * persisted ledger entry keyed by `entryId`, plus the authoritative per-user
 * balances and per-campaign budgets. Two snapshots compare equal iff the
 * durable Firestore state is identical.
 */
interface DurableSnapshot {
  ledger: Record<string, LedgerEntry>;
  balanceCentsByUser: Record<string, number>;
  budgetCentsByCampaign: Record<string, number>;
}

async function snapshotDurable(
  ledger: MemoryLedgerRepository,
  users: MemoryUserRepository,
  campaigns: MemoryCampaignRepository,
  seeded: SeededScenario,
): Promise<DurableSnapshot> {
  const ledgerById: Record<string, LedgerEntry> = {};
  for (const entry of ledger.all()) ledgerById[entry.entryId] = entry;

  const balanceCentsByUser: Record<string, number> = {};
  for (const userId of seeded.userIds) {
    const user = await users.getById(userId);
    balanceCentsByUser[userId] = user!.balanceCents;
  }

  const budgetCentsByCampaign: Record<string, number> = {};
  for (const campaignId of seeded.campaignIds) {
    const campaign = await campaigns.getById(campaignId);
    budgetCentsByCampaign[campaignId] = campaign!.budgetCents;
  }

  return { ledger: ledgerById, balanceCentsByUser, budgetCentsByCampaign };
}

/**
 * A `LedgerRepository` decorator that injects exactly one durable-write failure.
 *
 * The first `appendEntries` call throws (simulating a Firestore write failure);
 * every subsequent call delegates to the wrapped repository. This lets the test
 * drive the documented retry path: `runFlushCycle` does not ack on failure, so
 * the batch is expected to be retried on a later cycle and reconciled exactly
 * once (Requirements 3.4, 3.5).
 */
class FaultOnceLedgerRepository implements LedgerRepository {
  private failures: number;
  constructor(
    private readonly inner: MemoryLedgerRepository,
    failuresToInject = 1,
  ) {
    this.failures = failuresToInject;
  }

  async appendEntries(entries: LedgerEntry[]): Promise<void> {
    if (this.failures > 0) {
      this.failures -= 1;
      throw new Error("injected Firestore appendEntries failure");
    }
    await this.inner.appendEntries(entries);
  }

  async listByDeveloper(developerId: string): Promise<LedgerEntry[]> {
    return this.inner.listByDeveloper(developerId);
  }
}

describe("flush-service idempotency properties", () => {
  // Feature: spinshare-ad-exchange, Property 11: Flush idempotency (retry never double-counts)
  // Validates: Requirements 3.4, 3.5
  it("Property 11: a flush that fails once then retries yields the same durable state as a single clean flush", async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async (scenario) => {
        // (A) Baseline: a single clean, successful flush of the scenario.
        const cleanCounters = new MemoryCounterStore(
          new ManualClock(0),
          new SequentialIdGenerator(),
        );
        const cleanLedger = new MemoryLedgerRepository();
        const cleanUsers = new MemoryUserRepository();
        const cleanCampaigns = new MemoryCampaignRepository();
        const cleanSeeded = await applyScenario(
          scenario,
          cleanCounters,
          cleanUsers,
          cleanCampaigns,
        );
        await drainAll(
          {
            counters: cleanCounters,
            ledger: cleanLedger,
            users: cleanUsers,
            campaigns: cleanCampaigns,
          },
          500,
        );
        const expected = await snapshotDurable(
          cleanLedger,
          cleanUsers,
          cleanCampaigns,
          cleanSeeded,
        );

        // (B) Retry path: the first durable write fails, then succeeds. The
        // batch must be retried and reconciled exactly once — never lost and
        // never double-counted.
        const retryCounters = new MemoryCounterStore(
          new ManualClock(0),
          new SequentialIdGenerator(),
        );
        const innerLedger = new MemoryLedgerRepository();
        const faultyLedger = new FaultOnceLedgerRepository(innerLedger);
        const retryUsers = new MemoryUserRepository();
        const retryCampaigns = new MemoryCampaignRepository();
        const retrySeeded = await applyScenario(
          scenario,
          retryCounters,
          retryUsers,
          retryCampaigns,
        );
        const retryDeps: FlushServiceDeps = {
          counters: retryCounters,
          ledger: faultyLedger,
          users: retryUsers,
          campaigns: retryCampaigns,
        };

        // First cycle: durable write fails, batch is left in-flight (not acked).
        const failed = await runFlushCycle(retryDeps, 500);
        expect(failed.flushed).toBe(false);

        // Retry until everything reconciles (subsequent writes succeed). Bound
        // the loop so a non-retrying store cannot spin forever.
        let guard = 0;
        for (;;) {
          const result = await runFlushCycle(retryDeps, 500);
          if (result.flushed && result.drained === 0) break;
          if (++guard > scenario.impressions.length + 5) break;
        }

        const actual = await snapshotDurable(
          innerLedger,
          retryUsers,
          retryCampaigns,
          retrySeeded,
        );

        // The retried flush must land identical durable state to a single flush:
        // same ledger entries (idempotent by entryId), same balances/budgets.
        expect(actual).toEqual(expected);
      }),
      RUNS,
    );
  });
});
