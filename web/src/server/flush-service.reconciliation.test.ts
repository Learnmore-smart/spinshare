// Feature: spinshare-ad-exchange
//
// Regression tests for the flush poison bug: credited impressions stayed stuck
// in the RTDB pending queue (Firestore `ledgerEntries` empty, dashboard $0)
// because `applyBalanceDeltaCents` threw `User not found` when no durable
// `users/{id}` doc existed — which, under JWT sessions, is the normal case for a
// freshly-credited developer. `runFlushCycle` caught the throw, nacked the
// batch, and retried forever.
//
// These assert reconciliation is self-healing: a credit for an un-provisioned
// developer (and/or a deleted campaign) flushes durably and clears pending.

import { describe, expect, it } from "vitest";

import { computeSplit } from "@spinshare/core";

import {
  ManualClock,
  MemoryCampaignRepository,
  MemoryCounterStore,
  MemoryLedgerRepository,
  MemoryUserRepository,
  SequentialIdGenerator,
} from "./adapters/memory";
import { runFlushCycle, type FlushServiceDeps } from "./flush-service";

function harness() {
  const counters = new MemoryCounterStore(
    new ManualClock(0),
    new SequentialIdGenerator(),
  );
  const ledger = new MemoryLedgerRepository();
  const users = new MemoryUserRepository();
  const campaigns = new MemoryCampaignRepository();
  const deps: FlushServiceDeps = { counters, ledger, users, campaigns };
  return { counters, ledger, users, campaigns, deps };
}

describe("flush-service reconciliation is self-healing", () => {
  it("flushes a credit for a developer with no durable user record, creating the user", async () => {
    const { counters, ledger, users, campaigns, deps } = harness();

    // Seed only the campaign — the developer has NO durable users/{id} doc,
    // exactly the production state (JWT sessions create no user record).
    campaigns.seed({
      id: "cmp_1",
      advertiserId: "adv_0",
      adText: "ad",
      cpmCents: 30_000,
      budgetCents: 5_000,
      status: "active",
      createdAtMs: 0,
    });

    const split = computeSplit(30_000);
    const applied = await counters.applyImpression({
      developerId: "dev-no-record",
      campaignId: "cmp_1",
      entryId: "entry_1",
      split,
      occurredAtMs: 0,
    });
    expect(applied.applied).toBe(true);

    // Before the fix this looped forever (flushed:false); now it reconciles.
    const result = await runFlushCycle(deps, 500);
    expect(result.flushed).toBe(true);
    expect(result.drained).toBe(1);

    // Durable ledger entry persisted (this is what the dashboard reads).
    expect(ledger.size).toBe(1);
    expect(ledger.get("entry_1")?.developerCreditCents).toBe(
      split.developerCreditCents,
    );

    // The missing user was created carrying the credited balance.
    const user = await users.getById("dev-no-record");
    expect(user).not.toBeNull();
    expect(user!.balanceCents).toBe(split.developerCreditCents);

    // Pending queue is drained — a second cycle finds nothing.
    const second = await runFlushCycle(deps, 500);
    expect(second.flushed).toBe(true);
    expect(second.drained).toBe(0);
  });

  it("skips a deleted campaign's budget delta instead of poisoning the batch", async () => {
    const { counters, ledger, users, campaigns, deps } = harness();

    // Neither the user nor the campaign has a durable record. The impression was
    // credited against a campaign that has since been removed.
    const split = computeSplit(30_000);
    await counters.applyImpression({
      developerId: "dev-x",
      campaignId: "cmp-deleted",
      entryId: "entry_x",
      split,
      occurredAtMs: 0,
    });

    const result = await runFlushCycle(deps, 500);

    // Reconciliation still succeeds: ledger entry persists, balance is created,
    // and the missing campaign's budget delta is silently skipped.
    expect(result.flushed).toBe(true);
    expect(result.drained).toBe(1);
    expect(ledger.size).toBe(1);
    expect((await users.getById("dev-x"))!.balanceCents).toBe(
      split.developerCreditCents,
    );
    expect(await campaigns.getById("cmp-deleted")).toBeNull();
  });
});
