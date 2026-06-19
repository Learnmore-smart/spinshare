/**
 * Earnings-hold / clawback tests (anti-fraud Tier 3a).
 *
 * Locks the load-bearing money invariants of the hold overlay:
 *   - earned revenue is credited as *held* (raises the total but NOT the
 *     withdrawable/available balance), and cannot be paid out while held;
 *   - held lots mature into available only once their hold window elapses;
 *   - a fraud-scan clawback voids only still-held (un-matured) earnings,
 *     leaving matured earnings (which survived the window) untouched;
 *   - lots within the same coalescing bucket collapse so the array stays small;
 *   - payout pays exactly the matured (available) amount and never the held one.
 */

import { describe, expect, it } from "vitest";
import {
  EARNINGS_HOLD_WINDOW_SECONDS,
  HELD_LOT_BUCKET_MS,
  NEW_ACCOUNT_HOLD_WINDOW_SECONDS,
  computeSplit,
  type User,
} from "@spinshare/core";

import {
  ManualClock,
  MemoryCampaignRepository,
  MemoryCounterStore,
  MemoryLedgerRepository,
  MemoryUserRepository,
  MemoryPayoutAttemptRepository,
  MockPayoutGateway,
  SequentialIdGenerator,
} from "./adapters/memory";
import { runFlushCycle, type FlushServiceDeps } from "./flush-service";
import { BELOW_MINIMUM_ERROR, withdrawBalance } from "./payout-service";

const DEV = "dev-hold";
const ACCT = "acct_hold_123";

/** A maturation time aligned to a bucket boundary (keeps math exact). */
const MATURES_AT = 10 * HELD_LOT_BUCKET_MS;

function newUsers(seed?: Partial<User>): MemoryUserRepository {
  const users = new MemoryUserRepository(new SequentialIdGenerator());
  if (seed) {
    users.seed({
      id: DEV,
      email: "dev@spinshare.test",
      provider: "github",
      role: "developer",
      balanceCents: 0,
      stripeConnectAccountId: ACCT,
      payoutsEnabled: true,
      ...seed,
    });
  }
  return users;
}

describe("earnings hold — repository invariants", () => {
  it("credits earned revenue as held: total rises, available stays 0", async () => {
    const users = newUsers({});
    await users.creditHeldEarnings(DEV, 1_000, MATURES_AT);

    const user = await users.getById(DEV);
    expect(user?.balanceCents).toBe(1_000);
    expect(user?.heldCents).toBe(1_000);
    // Available (balance − held) is 0 → not withdrawable.
    expect(await users.tryDebitBalanceCents(DEV, 1)).toBe(false);
    expect((await users.getById(DEV))?.balanceCents).toBe(1_000);
  });

  it("coalesces credits in the same bucket into one lot", async () => {
    const users = newUsers({});
    await users.creditHeldEarnings(DEV, 100, MATURES_AT - 5);
    await users.creditHeldEarnings(DEV, 250, MATURES_AT - 1);

    const user = await users.getById(DEV);
    expect(user?.heldLots).toHaveLength(1);
    expect(user?.heldCents).toBe(350);
    expect(user?.heldLots?.[0]?.cents).toBe(350);
  });

  it("matures due lots into available without changing the total", async () => {
    const users = newUsers({});
    await users.creditHeldEarnings(DEV, 1_000, MATURES_AT);

    // Before maturity: nothing matures, still not withdrawable.
    expect(await users.matureHeldEarnings(DEV, MATURES_AT - 1)).toBe(0);
    expect(await users.tryDebitBalanceCents(DEV, 1)).toBe(false);

    // At/after maturity: the whole lot moves held → available.
    expect(await users.matureHeldEarnings(DEV, MATURES_AT)).toBe(1_000);
    const user = await users.getById(DEV);
    expect(user?.balanceCents).toBe(1_000);
    expect(user?.heldCents).toBe(0);
    expect(user?.heldLots).toHaveLength(0);
    expect(await users.tryDebitBalanceCents(DEV, 1_000)).toBe(true);
  });

  it("clawback voids only still-held lots; matured earnings survive", async () => {
    const users = newUsers({});
    await users.creditHeldEarnings(DEV, 400, MATURES_AT); // will mature
    await users.creditHeldEarnings(DEV, 600, MATURES_AT + HELD_LOT_BUCKET_MS); // still held

    // Mature the first lot, then run a clawback at that same instant.
    await users.matureHeldEarnings(DEV, MATURES_AT);
    const voided = await users.voidHeldEarnings(DEV, MATURES_AT);

    expect(voided).toBe(600); // only the un-matured lot
    const user = await users.getById(DEV);
    expect(user?.balanceCents).toBe(400); // matured 400 survives
    expect(user?.heldCents).toBe(0);
    // The survived 400 is now fully available.
    expect(await users.tryDebitBalanceCents(DEV, 400)).toBe(true);
  });

  it("legacy users without a held split are fully available", async () => {
    const users = newUsers({ balanceCents: 5_000 });
    // No heldCents field at all → whole balance withdrawable.
    expect(await users.tryDebitBalanceCents(DEV, 5_000)).toBe(true);
    expect(await users.voidHeldEarnings(DEV, MATURES_AT)).toBe(0);
  });
});

describe("earnings hold — progressive trust (Tier 3d)", () => {
  // A clock on an hour boundary so maturesAtMs lands on its own bucket (no
  // rounding skew): 30 days in ms is an exact multiple of HELD_LOT_BUCKET_MS.
  const NOW = 30 * 86_400 * 1_000;

  function flushHarness(): {
    users: MemoryUserRepository;
    counters: MemoryCounterStore;
    deps: FlushServiceDeps;
  } {
    const counters = new MemoryCounterStore(
      new ManualClock(0),
      new SequentialIdGenerator(),
    );
    const users = new MemoryUserRepository();
    const deps: FlushServiceDeps = {
      counters,
      ledger: new MemoryLedgerRepository(),
      users,
      campaigns: new MemoryCampaignRepository(),
      nowMs: () => NOW,
    };
    return { users, counters, deps };
  }

  function seedDev(users: MemoryUserRepository, id: string, createdAtMs: number) {
    users.seed({
      id,
      email: `${id}@spinshare.test`,
      provider: "github",
      role: "developer",
      balanceCents: 0,
      createdAtMs,
    });
  }

  it("holds a young account's earnings longer than an established account's", async () => {
    const { users, counters, deps } = flushHarness();
    seedDev(users, "young", NOW - 1 * 86_400 * 1_000); // 1 day old → new
    seedDev(users, "old", NOW - 30 * 86_400 * 1_000); // 30 days old → established

    const split = computeSplit(30_000);
    for (const developerId of ["young", "old"]) {
      await counters.applyImpression({
        developerId,
        campaignId: "cmp_1",
        entryId: `entry_${developerId}`,
        split,
        occurredAtMs: 0,
      });
    }

    const result = await runFlushCycle(deps, 500);
    expect(result.flushed).toBe(true);

    const young = await users.getById("young");
    const old = await users.getById("old");
    expect(young?.heldLots?.[0]?.maturesAtMs).toBe(
      NOW + NEW_ACCOUNT_HOLD_WINDOW_SECONDS * 1_000,
    );
    expect(old?.heldLots?.[0]?.maturesAtMs).toBe(
      NOW + EARNINGS_HOLD_WINDOW_SECONDS * 1_000,
    );
    // Both still hold the full earned amount (progressive trust delays, never
    // reduces, legitimate earnings).
    expect(young?.heldCents).toBe(split.developerCreditCents);
    expect(old?.heldCents).toBe(split.developerCreditCents);
  });
});

describe("earnings hold — payout integration", () => {
  function payoutDeps(users: MemoryUserRepository, nowMs: number) {
    return {
      users,
      payouts: new MockPayoutGateway(new SequentialIdGenerator()),
      payoutAttempts: new MemoryPayoutAttemptRepository(),
      nowMs: () => nowMs,
      newAttemptId: () => "poa_hold",
    };
  }

  it("blocks withdrawal of held earnings, then pays out once matured", async () => {
    const users = newUsers({});
    await users.creditHeldEarnings(DEV, 1_000, MATURES_AT);

    // While held, the available balance is below the minimum → blocked.
    const blocked = await withdrawBalance(payoutDeps(users, MATURES_AT - 1), DEV);
    expect(blocked).toEqual({
      ok: false,
      status: 422,
      error: BELOW_MINIMUM_ERROR,
    });
    expect((await users.getById(DEV))?.balanceCents).toBe(1_000);

    // Once the hold window elapses, withdrawBalance matures then pays it out.
    const paid = await withdrawBalance(payoutDeps(users, MATURES_AT), DEV);
    expect(paid.ok).toBe(true);
    if (paid.ok) {
      expect(paid.paidOutCents).toBe(1_000);
    }
    expect((await users.getById(DEV))?.balanceCents).toBe(0);
  });
});
